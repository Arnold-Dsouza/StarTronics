import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface Quote {
  id: string;
  repair_request_id: string;
  amount: number;
  currency: string;
  breakdown: {
    items: Array<{ description: string; amount: number }>;
    notes?: string;
  };
  created_at: string;
  repair_requests?: {
    title?: string;
    devices?: {
      type?: string;
      brand?: string;
      model?: string;
    };
  };
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quote');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quoteId || !user) {
      navigate('/quotes');
      return;
    }
    loadPaymentDetails();
  }, [quoteId, user]);

  async function loadPaymentDetails() {
    // Load quote
    const { data: quoteData } = await supabase
      .from('quotes')
      .select(`
        *,
        repair_requests (
          title,
          devices ( type, brand, model )
        )
      `)
      .eq('id', quoteId)
      .single();

    if (quoteData) {
      setQuote(quoteData as Quote);
    }

    // Load payment
    const { data: paymentData } = await supabase
      .from('payments')
      .select('*')
      .eq('quote_id', quoteId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (paymentData) {
      setPayment(paymentData as Payment);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin text-4xl mb-4">⚙️</div>
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success Animation */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 mb-4 animate-fade-in">
          <div className="text-5xl animate-bounce">✓</div>
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-2">Payment Successful!</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Your payment has been processed successfully
        </p>
      </div>

      {/* Payment Details Card */}
      {payment && quote && (
        <div className="card mb-6">
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Transaction ID</h3>
              <p className="font-mono text-sm">{payment.id}</p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">Date & Time</h3>
              <p className="text-sm">{new Date(payment.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-6">
            <div className="text-3xl">
              {quote.repair_requests?.devices?.type === 'phone' ? '📱' :
               quote.repair_requests?.devices?.type === 'laptop' ? '💻' : '🔧'}
            </div>
            <div className="flex-1">
              <h4 className="font-bold mb-1">
                {quote.repair_requests?.devices?.brand} {quote.repair_requests?.devices?.model}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {quote.repair_requests?.title}
              </p>
            </div>
          </div>

          {quote.breakdown?.items && (
            <div className="space-y-2 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm font-semibold mb-3">Bill Breakdown</div>
              {quote.breakdown.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{item.description}</span>
                  <span className="font-medium">₹{Number(item.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-bold">Amount Paid</span>
            <span className="text-3xl font-bold gradient-text">₹{payment.amount.toFixed(2)}</span>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✉️</span>
              <div>
                <p className="text-sm font-semibold text-green-900 dark:text-green-300 mb-1">
                  Receipt Sent
                </p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  A payment receipt has been sent to your registered email address.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/repairs" className="btn btn-primary flex-1 text-center">
          View My Repairs
        </Link>
        <Link to="/payments" className="btn btn-outline flex-1 text-center">
          Payment History
        </Link>
        {quote && (
          <Link to={`/stories/new?quote=${quote.id}`} className="btn btn-outline flex-1 text-center">
            Share Your Story
          </Link>
        )}
        <button
          onClick={() => window.print()}
          className="btn btn-outline sm:w-auto"
        >
          🖨️ Print Receipt
        </button>
      </div>

      {/* Help Section */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Need help with your payment?
        </p>
        <Link to="/dashboard" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
          Contact Support →
        </Link>
      </div>
    </div>
  );
}
