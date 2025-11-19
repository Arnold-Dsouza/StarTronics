import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface RepairRequest {
  id: string;
  user_id: string;
  device_id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  technician_notes?: string;
  created_at: string;
  devices?: {
    type: string;
    brand?: string;
    model?: string;
  };
  user_profiles?: {
    display_name?: string;
  };
  assigned_technician?: {
    display_name?: string;
  };
}

interface QuoteSummary {
  pending: number;
  paid: number;
}

export default function TechnicianDashboard() {
  const [myRequests, setMyRequests] = useState<RepairRequest[]>([]);
  const [openRequests, setOpenRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [saving, setSaving] = useState(false);
  // Billing creation state (multi-item, INR only)
  const [billingRequest, setBillingRequest] = useState<RepairRequest | null>(null);
  const [billItems, setBillItems] = useState<{ description: string; amount: string }[]>([
    { description: '', amount: '' }
  ]);
  const [billNotes, setBillNotes] = useState('');
  // Edit existing bill state (for pending quotes)
  const [editingRequest, setEditingRequest] = useState<RepairRequest | null>(null);
  const [editQuoteId, setEditQuoteId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<{ description: string; amount: string }[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const totalAmount = billItems.reduce((sum, item) => {
    const val = parseFloat(item.amount);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const editTotalAmount = editItems.reduce((sum, item) => {
    const val = parseFloat(item.amount);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const { user } = useAuth();
  const [quoteSummary, setQuoteSummary] = useState<QuoteSummary>({ pending: 0, paid: 0 });
  const [editableQuoteRequestIds, setEditableQuoteRequestIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadRequests();
      loadOpenUnassigned();
      loadQuoteSummary();
    }
  }, [user]);

  async function loadQuoteSummary() {
    const { data: sent } = await supabase
      .from('quotes')
      .select('id, repair_request_id')
      .eq('technician_id', user?.id)
      .eq('status', 'sent');
    const { data: accepted } = await supabase
      .from('quotes')
      .select('id')
      .eq('technician_id', user?.id)
      .eq('status', 'accepted');
    setQuoteSummary({ pending: (sent || []).length, paid: (accepted || []).length });
    setEditableQuoteRequestIds((sent || []).map((q: any) => q.repair_request_id));
  }

  async function loadRequests() {
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`
        *,
        devices (type, brand, model)
      `)
      .eq('assigned_technician_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyRequests(data as RepairRequest[]);
    }
    setLoading(false);
  }

  async function handleAccept(request: RepairRequest) {
    setSaving(true);
    const { error } = await supabase
      .from('repair_requests')
      .update({
        status: 'accepted',
        technician_notes: technicianNotes || null,
      })
      .eq('id', request.id);

    if (!error) {
      await loadRequests();
      setSelectedRequest(null);
      setTechnicianNotes('');
    }
    setSaving(false);
  }

  async function handleReject(request: RepairRequest) {
    if (!technicianNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('repair_requests')
      .update({
        status: 'technician_rejected',
        technician_notes: technicianNotes,
      })
      .eq('id', request.id);

    if (!error) {
      await loadRequests();
      await loadOpenUnassigned();
      setSelectedRequest(null);
      setTechnicianNotes('');
    }
    setSaving(false);
  }

  async function handleCancel(request: RepairRequest) {
    if (!technicianNotes.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('repair_requests')
      .update({
        status: 'cancelled',
        technician_notes: technicianNotes,
      })
      .eq('id', request.id);

    if (!error) {
      await loadRequests();
      setSelectedRequest(null);
      setTechnicianNotes('');
    }
    setSaving(false);
  }

  async function handleCreateBill(request: RepairRequest) {
    if (billItems.length === 0) {
      alert('Add at least one line item');
      return;
    }
    const parsedItems = billItems
      .map(i => ({ description: i.description.trim(), amount: parseFloat(i.amount) }))
      .filter(i => i.description && !isNaN(i.amount) && i.amount > 0);
    if (parsedItems.length === 0) {
      alert('Provide valid descriptions and positive amounts');
      return;
    }
    const amountNum = parsedItems.reduce((s, i) => s + i.amount, 0);
    if (amountNum <= 0) {
      alert('Total must be greater than zero');
      return;
    }
    setSaving(true);

    // 1) Insert quote
    const { error: quoteError } = await supabase
      .from('quotes')
      .insert({
        repair_request_id: request.id,
        technician_id: user?.id,
        amount: amountNum,
        currency: 'INR',
        breakdown: {
          items: parsedItems,
          notes: billNotes || null
        },
        status: 'sent'
      });

    if (quoteError) {
      alert(`Failed to create bill: ${quoteError.message}`);
      setSaving(false);
      return;
    }

    // 2) Update repair request status to completed (device repaired)
    const { error: updateError } = await supabase
      .from('repair_requests')
      .update({ status: 'completed' })
      .eq('id', request.id);

    if (updateError) {
      alert(`Bill created but failed to update request status: ${updateError.message}`);
    } else {
      await loadRequests();
    }

    // Reset billing UI
    setBillingRequest(null);
    setBillItems([{ description: '', amount: '' }]);
    setBillNotes('');
    setSaving(false);
  }

  async function startEditBill(request: RepairRequest) {
    // Load pending quote for this request by current technician
    const { data, error } = await supabase
      .from('quotes')
      .select('id, breakdown')
      .eq('repair_request_id', request.id)
      .eq('technician_id', user?.id)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (error || !data) {
      alert('No pending bill found to edit for this request.');
      return;
    }
    setEditingRequest(request);
    setEditQuoteId(data.id as string);
    const items = Array.isArray((data as any).breakdown?.items) ? (data as any).breakdown.items : [];
    setEditItems(items.map((it: any) => ({ description: String(it.description || ''), amount: String(it.amount ?? '') })));
    setEditNotes(((data as any).breakdown?.notes ?? '') as string);
  }

  async function handleUpdateBill() {
    if (!editingRequest || !editQuoteId) return;
    if (editItems.length === 0) {
      alert('Add at least one line item');
      return;
    }
    const parsedItems = editItems
      .map(i => ({ description: i.description.trim(), amount: parseFloat(i.amount) }))
      .filter(i => i.description && !isNaN(i.amount) && i.amount > 0);
    if (parsedItems.length === 0) {
      alert('Provide valid descriptions and positive amounts');
      return;
    }
    const amountNum = parsedItems.reduce((s, i) => s + i.amount, 0);
    if (amountNum <= 0) {
      alert('Total must be greater than zero');
      return;
    }
    setEditSaving(true);
    const { error } = await supabase
      .from('quotes')
      .update({
        amount: amountNum,
        breakdown: {
          items: parsedItems,
          notes: editNotes || null
        }
      })
      .eq('id', editQuoteId);
    if (error) {
      alert(`Failed to update bill: ${error.message}`);
    } else {
      // Close editor
      setEditingRequest(null);
      setEditQuoteId(null);
      setEditItems([]);
      setEditNotes('');
      // Refresh quote summary to reflect updated amount (and ensure still pending)
      await loadQuoteSummary();
    }
    setEditSaving(false);
  }

  async function loadOpenUnassigned() {
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`
        *,
        devices (type, brand, model)
      `)
      .is('assigned_technician_id', null)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (!error && data) setOpenRequests(data as RepairRequest[]);
  }

  async function handleClaim(request: RepairRequest) {
    setSaving(true);
    const { error } = await supabase
      .from('repair_requests')
      .update({ assigned_technician_id: user?.id })
      .eq('id', request.id)
      .is('assigned_technician_id', null)
      .eq('status', 'pending');
    if (!error) {
      await loadRequests();
      await loadOpenUnassigned();
    }
    setSaving(false);
  }

  const statusColors: Record<string, string> = {
    approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    technician_rejected: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin text-4xl mb-4">⚙️</div>
        <p className="text-gray-600 dark:text-gray-300">Loading requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Technician Workspace</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Claim, process and bill repair requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="card-hover bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <p className="text-purple-100 font-medium mb-2">Assigned</p>
          <p className="text-4xl font-bold mb-1">{myRequests.length}</p>
          <p className="text-xs text-purple-100">Current workload</p>
        </div>
        <div className="card-hover bg-gradient-to-br from-brand-500 to-brand-600 text-white">
          <p className="text-brand-100 font-medium mb-2">Open</p>
          <p className="text-4xl font-bold mb-1">{openRequests.length}</p>
          <p className="text-xs text-brand-100">Available to claim</p>
        </div>
        <div className="card-hover bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <p className="text-yellow-100 font-medium mb-2">Bills Pending</p>
          <p className="text-4xl font-bold mb-1">{quoteSummary.pending}</p>
          <p className="text-xs text-yellow-100">Awaiting payment</p>
        </div>
        <div className="card-hover bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <p className="text-emerald-100 font-medium mb-2">Bills Paid</p>
          <p className="text-4xl font-bold mb-1">{quoteSummary.paid}</p>
          <p className="text-xs text-emerald-100">Completed billing</p>
        </div>
      </div>

      {/* Open Requests */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Open Requests</h2>
        <div className="grid gap-6">
          {openRequests.length === 0 ? (
            <div className="card text-center py-8"><p className="text-gray-500">No open requests</p></div>
          ) : (
            openRequests.map((request: RepairRequest) => (
              <div key={request.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {request.devices?.brand || 'Device'} {request.devices?.model || ''}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[request.status] || statusColors.approved}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    {/* Customer display hidden; remove when profile join added */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Device: {request.devices?.type} • Urgency: {request.urgency}</p>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{request.description}</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <button onClick={() => handleClaim(request)} disabled={saving} className="btn btn-primary">
                    {saving ? 'Claiming...' : 'Claim Request'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* My Assigned Requests */}
      <div className="grid gap-6">
        {myRequests.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No assigned requests yet</p>
          </div>
        ) : (
          myRequests.map((request: RepairRequest) => (
            <div key={request.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      {request.devices?.brand || 'Device'} {request.devices?.model || ''}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[request.status] || statusColors.approved}`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {/* Customer display hidden; remove when profile join added */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Device: {request.devices?.type} • Urgency: {request.urgency}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    {request.description}
                  </p>
                  {request.technician_notes && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">My Notes:</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{request.technician_notes}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Created: {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {(request.status === 'pending' || request.status === 'technician_rejected') && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  {selectedRequest?.id === request.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={technicianNotes}
                        onChange={(e) => setTechnicianNotes(e.target.value)}
                        placeholder="Add notes (required for rejection, optional for acceptance)"
                        className="input h-24 resize-y w-full"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAccept(request)}
                          disabled={saving}
                          className="btn bg-green-600 hover:bg-green-700 text-white px-6"
                        >
                          {saving ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleReject(request)}
                          disabled={saving}
                          className="btn bg-orange-600 hover:bg-orange-700 text-white px-6"
                        >
                          {saving ? 'Processing...' : 'Reject'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(null);
                            setTechnicianNotes('');
                          }}
                          className="btn btn-outline px-6"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setTechnicianNotes(request.technician_notes || '');
                      }}
                      className="btn btn-primary"
                    >
                      Review Request
                    </button>
                  )}
                </div>
              )}

              {(request.status === 'accepted' || request.status === 'in_progress') && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                  {/* Cancel Section */}
                  {selectedRequest?.id === request.id && selectedRequest.id === request.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={technicianNotes}
                        onChange={(e) => setTechnicianNotes(e.target.value)}
                        placeholder="Provide reason for cancellation (required)"
                        className="input h-24 resize-y w-full"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleCancel(request)}
                          disabled={saving}
                          className="btn bg-red-600 hover:bg-red-700 text-white px-6"
                        >
                          {saving ? 'Processing...' : 'Cancel Work'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(null);
                            setTechnicianNotes('');
                          }}
                          className="btn btn-outline px-6"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setTechnicianNotes(request.technician_notes || '');
                        }}
                        className="btn bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Cancel with Note
                      </button>
                      <button
                        onClick={() => setBillingRequest(request)}
                        className="btn btn-primary"
                      >
                        Mark Repaired & Create Bill
                      </button>
                    </div>
                  )}

                  {/* Billing Form Inline (INR multi-item) */}
                  {billingRequest?.id === request.id && (
                    <div className="border rounded-lg p-4 bg-brand-50 dark:bg-slate-800 space-y-3">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">Create Bill (INR)</h4>
                      <div className="space-y-2">
                        {billItems.map((item, idx) => (
                          <div key={idx} className="grid md:grid-cols-6 gap-2 items-end">
                            <div className="md:col-span-4 flex flex-col">
                              <label className="text-xs font-medium mb-1">Description</label>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  const copy = [...billItems];
                                  copy[idx].description = e.target.value;
                                  setBillItems(copy);
                                }}
                                className="input"
                                placeholder="e.g. Screen replacement"
                              />
                            </div>
                            <div className="md:col-span-2 flex flex-col">
                              <label className="text-xs font-medium mb-1">Amount (INR)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => {
                                  const copy = [...billItems];
                                  copy[idx].amount = e.target.value;
                                  setBillItems(copy);
                                }}
                                className="input"
                                placeholder="0.00"
                              />
                            </div>
                            {billItems.length > 1 && (
                              <button
                                onClick={() => {
                                  setBillItems(billItems.filter((_, i) => i !== idx));
                                }}
                                className="text-xs text-red-600 hover:text-red-700"
                              >Remove</button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => setBillItems([...billItems, { description: '', amount: '' }])}
                          className="btn btn-outline text-sm"
                        >+ Add Item</button>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-medium mb-1">Notes (optional)</label>
                        <input
                          type="text"
                          value={billNotes}
                          onChange={(e) => setBillNotes(e.target.value)}
                          className="input"
                          placeholder="Additional remarks"
                        />
                      </div>
                      <div className="text-sm font-semibold">Total: INR {totalAmount.toFixed(2)}</div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleCreateBill(request)}
                          disabled={saving}
                          className="btn bg-green-600 hover:bg-green-700 text-white"
                        >
                          {saving ? 'Creating Bill...' : 'Submit Bill'}
                        </button>
                        <button
                          onClick={() => {
                            setBillingRequest(null);
                            setBillItems([{ description: '', amount: '' }]);
                            setBillNotes('');
                          }}
                          className="btn btn-outline"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Submitting will mark this request as completed and visible for customer payment.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Completed - allow editing of pending bills */}
              {request.status === 'completed' && editableQuoteRequestIds.includes(request.id) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                  {editingRequest?.id === request.id ? (
                    <div className="border rounded-lg p-4 bg-brand-50 dark:bg-slate-800 space-y-3">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">Edit Bill (INR)</h4>
                      <div className="space-y-2">
                        {editItems.map((item, idx) => (
                          <div key={idx} className="grid md:grid-cols-6 gap-2 items-end">
                            <div className="md:col-span-4 flex flex-col">
                              <label className="text-xs font-medium mb-1">Description</label>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => {
                                  const copy = [...editItems];
                                  copy[idx].description = e.target.value;
                                  setEditItems(copy);
                                }}
                                className="input"
                                placeholder="e.g. Screen replacement"
                              />
                            </div>
                            <div className="md:col-span-2 flex flex-col">
                              <label className="text-xs font-medium mb-1">Amount (INR)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => {
                                  const copy = [...editItems];
                                  copy[idx].amount = e.target.value;
                                  setEditItems(copy);
                                }}
                                className="input"
                                placeholder="0.00"
                              />
                            </div>
                            {editItems.length > 1 && (
                              <button
                                onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                                className="text-xs text-red-600 hover:text-red-700"
                              >Remove</button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => setEditItems([...editItems, { description: '', amount: '' }])}
                          className="btn btn-outline text-sm"
                        >+ Add Item</button>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-medium mb-1">Notes (optional)</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="input"
                          placeholder="Additional remarks"
                        />
                      </div>
                      <div className="text-sm font-semibold">Total: INR {editTotalAmount.toFixed(2)}</div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleUpdateBill}
                          disabled={editSaving}
                          className="btn bg-green-600 hover:bg-green-700 text-white"
                        >
                          {editSaving ? 'Updating...' : 'Update Bill'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingRequest(null);
                            setEditQuoteId(null);
                            setEditItems([]);
                            setEditNotes('');
                          }}
                          className="btn btn-outline"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Edits are allowed until the customer pays.</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditBill(request)}
                      className="btn btn-primary"
                    >
                      Edit Bill
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
