import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiListRepairRequests, apiDeleteRepairRequest, RepairRequest } from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';

interface Quote {
  id: string;
  repair_request_id: string;
  technician_id: string;
  amount: number;
  currency: string;
  breakdown: any;
  status: string; // sent | accepted | declined | expired
  created_at: string;
}

export default function RepairsList() {
  const [items, setItems] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [quotesByRequest, setQuotesByRequest] = useState<Record<string, Quote | undefined>>({});

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    apiListRepairRequests(user.id)
      .then(async res => {
        setItems(res);
        // After requests load, fetch quotes related to them
        const requestIds = res.map(r => r.id);
        if (requestIds.length) {
          const { data, error: qErr } = await supabase
            .from('quotes')
            .select('*')
            .in('repair_request_id', requestIds)
            .order('created_at', { ascending: false });
          if (!qErr && data) {
            // Keep only latest quote per request id
            const map: Record<string, Quote> = {};
            for (const q of data as Quote[]) {
              if (!map[q.repair_request_id]) map[q.repair_request_id] = q;
            }
            setQuotesByRequest(map);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this repair request? This action cannot be undone.')) {
      return;
    }

    try {
      await apiDeleteRepairRequest(user!.id, id);
      setItems(items.filter(item => item.id !== id));
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(`Failed to delete repair request: ${err.message}`);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    quoted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    technician_rejected: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
  };

  const urgencyIcons: Record<string, string> = {
    low: '🕐',
    normal: '⚡',
    high: '🚨'
  };

  function handleProceedToCheckout(quoteId: string) {
    navigate(`/checkout?quote=${quoteId}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">My Repair Requests</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Track and manage your device repairs</p>
        </div>
        {userProfile?.role === 'customer' && (
          <Link to="/repairs/new" className="btn btn-primary">
            <span className="text-lg mr-2">+</span> New Request
          </Link>
        )}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600 dark:text-gray-300">Loading your requests...</p>
        </div>
      )}

      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">No repair requests yet</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {userProfile?.role === 'customer'
              ? 'Get started by submitting your first repair request'
              : 'No requests available'}
          </p>
          {userProfile?.role === 'customer' && (
            <Link to="/repairs/new" className="btn btn-primary inline-flex">
              Create Your First Request
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map(item => (
          <div key={item.id} className="card-hover group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">
                  {item.devices?.type === 'phone' ? '📱' : 
                   item.devices?.type === 'laptop' ? '💻' : 
                   item.devices?.type === 'tablet' ? '📱' : 
                   item.devices?.type === 'watch' ? '⌚' : '🔧'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    {item.devices?.brand || 'Device'} {item.devices?.model || ''}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {item.devices?.type || 'Unknown'}
                  </p>
                </div>
              </div>
              <span className="text-xl">{urgencyIcons[item.urgency] || '⚡'}</span>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
              {item.description}
            </p>

            {(item.status === 'cancelled' || item.status === 'technician_rejected') && item.technician_notes && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">
                  {item.status === 'cancelled' ? 'Cancellation Reason:' : 'Rejection Reason:'}
                </p>
                <p className="text-sm text-red-800 dark:text-red-200">{item.technician_notes}</p>
              </div>
            )}

            {item.status === 'accepted' && item.technician_notes && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-green-900 dark:text-green-300 mb-1">Technician Note:</p>
                <p className="text-sm text-green-800 dark:text-green-200">{item.technician_notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[item.status] || statusColors.pending}`}>
                {item.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>

            {/* Quote (Bill) Section */}
            {quotesByRequest[item.id] && (
              <div className="border rounded-lg p-3 mb-3 bg-white/60 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Bill</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {quotesByRequest[item.id]!.status.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1 mb-2">
                  {quotesByRequest[item.id]!.breakdown?.items?.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">{it.description}</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">INR {Number(it.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="text-sm font-semibold mb-2">Total: INR {quotesByRequest[item.id]!.amount.toFixed(2)}</div>
                {quotesByRequest[item.id]!.breakdown?.notes && (
                  <p className="text-xs italic text-gray-500 dark:text-gray-400 mb-2">{quotesByRequest[item.id]!.breakdown.notes}</p>
                )}
                {quotesByRequest[item.id]!.status === 'sent' && userProfile?.role === 'customer' && (
                  <button
                    onClick={() => handleProceedToCheckout(quotesByRequest[item.id]!.id)}
                    className="btn btn-primary w-full text-sm"
                  >
                    Proceed to Checkout →
                  </button>
                )}
                {quotesByRequest[item.id]!.status === 'accepted' && (
                  <div className="text-green-600 dark:text-green-400 text-xs font-semibold">Paid ✔</div>
                )}
              </div>
            )}

            {item.status === 'pending' && (
              <div className="flex gap-2">
                <Link
                  to={`/repairs/edit/${item.id}`}
                  className="btn btn-outline flex-1 text-sm py-2"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="btn bg-red-500 hover:bg-red-600 text-white flex-1 text-sm py-2"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
