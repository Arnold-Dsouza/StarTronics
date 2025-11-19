import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface RepairRequest {
  id: string;
  user_id: string;
  device_id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  admin_notes?: string;
  technician_notes?: string;
  assigned_technician_id?: string;
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

export default function Admin() {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [technicians, setTechnicians] = useState<{ id: string; display_name?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRequests();
    loadTechnicians();
  }, []);

  async function loadTechnicians() {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .eq('role', 'technician');
    
    if (data) setTechnicians(data);
  }

  async function loadRequests() {
    const { data, error } = await supabase
      .from('repair_requests')
      .select(`
        *,
        devices (type, brand, model),
        user_profiles!repair_requests_user_id_fkey (display_name),
        assigned_technician:user_profiles!repair_requests_assigned_technician_id_fkey (display_name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data as RepairRequest[]);
    }
    setLoading(false);
  }

  async function handleApprove(request: RepairRequest) {
    setSaving(true);
    const { error } = await supabase
      .from('repair_requests')
      .update({
        status: 'approved',
        admin_notes: adminNotes || null,
        assigned_technician_id: selectedTechnicianId || null,
      })
      .eq('id', request.id);

    if (!error) {
      await loadRequests();
      setSelectedRequest(null);
      setAdminNotes('');
      setSelectedTechnicianId('');
    }
    setSaving(false);
  }

  async function handleReject(request: RepairRequest) {
    if (!adminNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('repair_requests')
      .update({
        status: 'rejected',
        admin_notes: adminNotes,
      })
      .eq('id', request.id);

    if (!error) {
      await loadRequests();
      setSelectedRequest(null);
      setAdminNotes('');
      setSelectedTechnicianId('');
    }
    setSaving(false);
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    technician_rejected: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
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
        <h1 className="text-3xl font-bold gradient-text">Admin Panel</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Review and manage repair requests</p>
      </div>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No repair requests yet</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      {request.devices?.brand || 'Device'} {request.devices?.model || ''}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[request.status] || statusColors.pending}`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Customer: {request.user_profiles?.display_name || 'Anonymous'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Device: {request.devices?.type} • Urgency: {request.urgency}
                  </p>
                  {request.assigned_technician_id && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <span className="font-semibold">Assigned to:</span> {request.assigned_technician?.display_name || 'Technician'}
                    </p>
                  )}
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    {request.description}
                  </p>
                  {request.admin_notes && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Admin Notes:</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{request.admin_notes}</p>
                    </div>
                  )}
                  {request.technician_notes && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-3">
                      <p className="text-sm font-semibold text-orange-900 dark:text-orange-300 mb-1">Technician Notes:</p>
                      <p className="text-sm text-orange-800 dark:text-orange-200">{request.technician_notes}</p>
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
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          Assign Technician (optional)
                        </label>
                        <select
                          value={selectedTechnicianId}
                          onChange={(e) => setSelectedTechnicianId(e.target.value)}
                          className="input w-full"
                        >
                          <option value="">-- No assignment --</option>
                          {technicians.map((tech) => (
                            <option key={tech.id} value={tech.id}>
                              {tech.display_name || tech.id}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes (required for rejection, optional for approval)"
                        className="input h-24 resize-y w-full"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(request)}
                          disabled={saving}
                          className="btn bg-green-600 hover:bg-green-700 text-white px-6"
                        >
                          {saving ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(request)}
                          disabled={saving}
                          className="btn bg-red-600 hover:bg-red-700 text-white px-6"
                        >
                          {saving ? 'Processing...' : 'Reject'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(null);
                            setAdminNotes('');
                            setSelectedTechnicianId('');
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
                        setAdminNotes(request.admin_notes || '');
                        setSelectedTechnicianId(request.assigned_technician_id || '');
                      }}
                      className="btn btn-primary"
                    >
                      Review Request
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
