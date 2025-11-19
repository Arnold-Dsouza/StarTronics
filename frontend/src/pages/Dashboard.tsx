import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface ActivityItem {
  id: string;
  type: 'request' | 'quote' | 'payment';
  title: string;
  created_at: string;
  status?: string;
  amount?: number;
}

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [activeQuoteCount, setActiveQuoteCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [recent, setRecent] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isCustomer = userProfile?.role === 'customer';
  const isTechnician = userProfile?.role === 'technician';

  // Redirect technicians to their workspace
  useEffect(() => {
    if (isTechnician) {
      navigate('/technician');
    }
  }, [isTechnician, navigate]);

  useEffect(() => {
    async function load() {
      if (!user || !isCustomer) { setLoading(false); return; }
      setLoading(true);

      // Repair request stats
      const { data: pendingReqs } = await supabase
        .from('repair_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      setPendingCount((pendingReqs || []).length);

      const { data: completedReqs } = await supabase
        .from('repair_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed');
      setCompletedCount((completedReqs || []).length);

      // Active quotes (sent, awaiting payment) for this user's completed requests
      const { data: completedForQuotes } = await supabase
        .from('repair_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed');
      const reqIds = (completedForQuotes || []).map(r => r.id);
      if (reqIds.length) {
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id')
          .in('repair_request_id', reqIds)
          .eq('status', 'sent');
        setActiveQuoteCount((quotes || []).length);
      } else {
        setActiveQuoteCount(0);
      }

      // Recent activity: latest 5 entries combined (requests, quotes, payments)
      const recentItems: ActivityItem[] = [];
      const { data: recentRequests } = await supabase
        .from('repair_requests')
        .select('id, title, created_at, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      (recentRequests || []).forEach((r: any) => recentItems.push({
        id: r.id,
        type: 'request',
        title: r.title || 'Repair Request',
        created_at: r.created_at,
        status: r.status
      }));

      if (reqIds.length) {
        const { data: recentQuotes } = await supabase
          .from('quotes')
          .select('id, repair_request_id, created_at, status, amount')
          .in('repair_request_id', reqIds)
          .order('created_at', { ascending: false })
          .limit(5);
        (recentQuotes || []).forEach((q: any) => recentItems.push({
          id: q.id,
          type: 'quote',
          title: 'Quote',
          created_at: q.created_at,
          status: q.status,
          amount: q.amount
        }));
      }

      const { data: recentPayments } = await supabase
        .from('payments')
        .select('id, created_at, status, amount, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      (recentPayments || []).forEach((p: any) => recentItems.push({
        id: p.id,
        type: 'payment',
        title: 'Payment',
        created_at: p.created_at,
        status: p.status,
        amount: p.amount
      }));

      // Sort combined recent by date desc and take top 8
      recentItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecent(recentItems.slice(0, 8));
      setLoading(false);
    }
    load();
  }, [user, isCustomer]);

  if (isTechnician) {
    return null; // Redirect handled
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Customer Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-300">Overview of your repairs, pending bills and history.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card-hover bg-gradient-to-br from-brand-500 to-brand-600 text-white">
          <p className="text-brand-100 font-medium mb-2">Pending Requests</p>
          <p className="text-5xl font-bold mb-1">{pendingCount}</p>
          <p className="text-sm text-brand-100">Awaiting technician actions</p>
        </div>
        <div className="card-hover bg-gradient-to-br from-accent-500 to-accent-600 text-white">
          <p className="text-accent-100 font-medium mb-2">Active Quotes</p>
          <p className="text-5xl font-bold mb-1">{activeQuoteCount}</p>
          <p className="text-sm text-accent-100">Pending payment</p>
        </div>
        <div className="card-hover bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <p className="text-emerald-100 font-medium mb-2">Completed Repairs</p>
          <p className="text-5xl font-bold mb-1">{completedCount}</p>
          <p className="text-sm text-emerald-100">Finished and billed</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        {loading && (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        )}
        {!loading && recent.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-lg">No activity yet</p>
            <p className="text-sm mt-2">Create a repair request to get started</p>
          </div>
        )}
        {!loading && recent.length > 0 && (
          <div className="space-y-3">
            {recent.map(item => (
              <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {item.type === 'request' ? '🛠️' : item.type === 'quote' ? '🧾' : '💳'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.created_at).toLocaleString()} • {item.status?.replace('_', ' ')?.toUpperCase()}
                      {item.amount ? ` • ₹${item.amount.toFixed(2)}` : ''}
                    </p>
                  </div>
                </div>
                {item.type === 'quote' && item.status === 'sent' && (
                  <a href={`/checkout?quote=${item.id}`} className="btn btn-primary btn-sm">Pay</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
