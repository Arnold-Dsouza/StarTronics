import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiGetRepairRequest, apiUpdateRepairRequest } from '../../lib/api';

export default function EditRepairRequest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    description: '',
    urgency: 'normal' as 'low' | 'normal' | 'high',
  });

  useEffect(() => {
    if (!user || !id) return;
    
    apiGetRepairRequest(user.id, id)
      .then((data) => {
        setFormData({
          description: data.description || '',
          urgency: (data.urgency as 'low' | 'normal' | 'high') || 'normal',
        });
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load repair request');
        setLoading(false);
      });
  }, [user, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !id) return;

    setSaving(true);
    setError(null);

    try {
      await apiUpdateRepairRequest(user.id, id, {
        description: formData.description,
        urgency: formData.urgency,
      });
      navigate('/repairs');
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
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
      <h1 className="text-3xl font-bold gradient-text mb-6">Edit Repair Request</h1>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Issue Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input h-32 resize-y"
              placeholder="Describe the issue..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Urgency Level
            </label>
            <div className="grid grid-cols-3 gap-4">
              {(['low', 'normal', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, urgency: level })}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    formData.urgency === level
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
                  }`}
                >
                  <div className="text-2xl mb-2">
                    {level === 'low' ? '🕐' : level === 'normal' ? '⚡' : '🚨'}
                  </div>
                  <div className="font-semibold capitalize text-gray-900 dark:text-white">
                    {level}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/repairs')}
              className="btn btn-outline px-8"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary px-8 flex-1"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
