import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface Quote {
  id: string;
  repair_request_id: string;
  technician_id: string;
  amount: number;
  currency: string;
  breakdown: any;
  status: string;
  created_at: string;
  repair_requests?: {
    title?: string;
    status?: string;
  };
}

export default function Quotes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadQuotes();
  }, [user]);

  async function loadQuotes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        repair_requests ( title, status )
      `)
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setQuotes(data as Quote[]);
    }
    setLoading(false);
  }

  function handleProceedToCheckout(quoteId: string) {
    navigate(`/checkout?quote=${quoteId}`);
  }

  const statusStyles: Record<string, string> = {
    sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    declined: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Quotes & Payment</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Review repair quotes and pay securely (demo).</p>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">💸</div>
          <p className="text-gray-600 dark:text-gray-300">Loading quotes...</p>
        </div>
      )}

      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && !error && quotes.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🧾</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">No quotes yet</h3>
          <p className="text-gray-600 dark:text-gray-300">Quotes will appear once a technician completes a repair and issues a bill.</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quotes.map(q => (
          <div key={q.id} className="card-hover group">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{q.repair_requests?.title || 'Repair Request'}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[q.status] || statusStyles.sent}`}>{q.status.toUpperCase()}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">INR {q.amount.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Issued {new Date(q.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            {q.breakdown?.items && Array.isArray(q.breakdown.items) && (
              <div className="mb-3 space-y-1">
                {q.breakdown.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{it.description}</span>
                    <span className="text-gray-900 dark:text-gray-100 font-medium">INR {Number(it.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            {q.breakdown?.notes && (
              <p className="text-xs text-gray-500 italic mb-3">{q.breakdown.notes}</p>
            )}
            {q.status === 'sent' && (
              <button
                onClick={() => handleProceedToCheckout(q.id)}
                className="btn btn-primary w-full"
              >
                Proceed to Checkout →
              </button>
            )}
            {q.status === 'accepted' && (
              <div className="text-green-600 dark:text-green-400 text-sm font-semibold">Paid ✔</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
