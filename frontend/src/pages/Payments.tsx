import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface PaymentRow {
  id: string;
  quote_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  quotes?: {
    repair_request_id: string;
    breakdown: any;
    repair_requests?: {
      title?: string;
      devices?: {
        type?: string;
        brand?: string;
        model?: string;
      };
    };
  };
}

interface TechnicianQuoteStatus {
  id: string;
  repair_request_id: string;
  technician_id: string;
  amount: number;
  status: string; // 'sent' pending payment, 'accepted' paid
  created_at: string;
  breakdown?: any;
  repair_requests?: {
    title?: string;
    devices?: {
      type?: string;
      brand?: string;
      model?: string;
    };
  };
}

export default function Payments() {
  const { user, userProfile } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [quoteStatuses, setQuoteStatuses] = useState<TechnicianQuoteStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomerHistory() {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          quotes (
            repair_request_id,
            breakdown,
            repair_requests (
              title,
              devices ( type, brand, model )
            )
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) setError(error.message); else setPayments(data as PaymentRow[]);
    }

    async function loadTechnicianStatuses() {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          id,
          repair_request_id,
          technician_id,
          amount,
          status,
          created_at,
          breakdown,
          repair_requests (
            title,
            devices ( type, brand, model )
          )
        `)
        .eq('technician_id', user!.id)
        .in('status', ['sent', 'accepted'])
        .order('created_at', { ascending: false });
      if (error) setError(error.message); else setQuoteStatuses(data as TechnicianQuoteStatus[]);
    }

    async function load() {
      if (!user) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      if (userProfile?.role === 'customer') {
        await loadCustomerHistory();
      } else if (userProfile?.role === 'technician') {
        await loadTechnicianStatuses();
      }
      setLoading(false);
    }
    load();
  }, [user, userProfile]);

  const isCustomer = userProfile?.role === 'customer';
  const isTechnician = userProfile?.role === 'technician';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">{isCustomer ? 'Payments' : 'Payment Status'}</h1>
        {isCustomer && (
          <p className="text-gray-600 dark:text-gray-300 mt-2">Your completed payment history.</p>
        )}
        {isTechnician && (
          <p className="text-gray-600 dark:text-gray-300 mt-2">Status of quotes you issued (pending vs paid).</p>
        )}
      </div>
      {loading && <div className="text-center py-12">Loading...</div>}
      {error && <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"><p className="text-red-600 dark:text-red-400">Error: {error}</p></div>}
      {isCustomer && !loading && !error && payments.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-600 dark:text-gray-300">No payments yet.</p>
        </div>
      )}
      {isTechnician && !loading && !error && quoteStatuses.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-600 dark:text-gray-300">No issued quotes requiring payment.</p>
        </div>
      )}
      {isCustomer && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {payments.map(p => (
            <div key={p.id} className="card-hover group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2">
                  <div className="text-2xl">
                    {p.quotes?.repair_requests?.devices?.type === 'phone' ? '📱' :
                     p.quotes?.repair_requests?.devices?.type === 'laptop' ? '💻' : '🔧'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">
                      {p.quotes?.repair_requests?.devices?.brand} {p.quotes?.repair_requests?.devices?.model || 'Repair'}
                    </h4>
                    <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  {p.status.toUpperCase()}
                </span>
              </div>
              {p.quotes?.breakdown?.items && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-3 space-y-1">
                  {p.quotes.breakdown.items.slice(0, 2).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{item.description}</span>
                      <span className="text-gray-900 dark:text-gray-100">₹{Number(item.amount).toFixed(2)}</span>
                    </div>
                  ))}
                  {p.quotes.breakdown.items.length > 2 && (
                    <p className="text-xs text-gray-500 italic">+{p.quotes.breakdown.items.length - 2} more items</p>
                  )}
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Total Paid</span>
                  <span className="text-xl font-bold gradient-text">₹{p.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isTechnician && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quoteStatuses.map(q => (
            <div key={q.id} className="card-hover group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2">
                  <div className="text-2xl">
                    {q.repair_requests?.devices?.type === 'phone' ? '📱' :
                     q.repair_requests?.devices?.type === 'laptop' ? '💻' : '🔧'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">
                      {q.repair_requests?.devices?.brand} {q.repair_requests?.devices?.model || q.repair_requests?.title || 'Repair'}
                    </h4>
                    <p className="text-xs text-gray-500">Issued {new Date(q.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${q.status === 'sent' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                  {q.status === 'sent' ? 'PENDING' : 'PAID'}
                </span>
              </div>
              {q.breakdown?.items && Array.isArray(q.breakdown.items) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-3 space-y-1">
                  {q.breakdown.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{item.description}</span>
                      <span className="text-gray-900 dark:text-gray-100">₹{Number(item.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              {q.breakdown?.notes && (
                <p className="text-xs italic text-gray-500 mb-3">{q.breakdown.notes}</p>
              )}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-xl font-bold gradient-text">₹{q.amount.toFixed(2)}</span>
                </div>
                {q.status === 'sent' && (
                  <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-400">Awaiting customer payment.</p>
                )}
                {q.status === 'accepted' && (
                  <p className="mt-2 text-xs text-green-600 dark:text-green-400">Customer paid.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
