import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiCreateRepairRequest } from '../../lib/api';

type Step = 1 | 2 | 3;

export default function NewRepairRequest() {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    deviceType: '',
    brand: '',
    model: '',
    issueDescription: '',
    urgency: 'normal' as 'low' | 'normal' | 'high',
    images: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleSubmit() {
    if (!user) {
      setError('You must be logged in to submit a repair request');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiCreateRepairRequest({
        deviceType: formData.deviceType,
        brand: formData.brand,
        model: formData.model,
        issueDescription: formData.issueDescription,
        urgency: formData.urgency,
        userId: user.id
      });
      // Show success and redirect
      setTimeout(() => navigate('/repairs'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit repair request');
      setLoading(false);
    }
  }

  const deviceIcons: Record<string, string> = {
    phone: '📱',
    laptop: '💻',
    tablet: '📱',
    watch: '⌚',
    headphones: '🎧',
    other: '🔧'
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with gradient */}
      <div className="text-center mb-12">
        <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-brand-100 to-accent-100 border border-brand-200 dark:border-brand-800 mb-4">
          <span className="text-sm font-semibold gradient-text">Get Your Device Fixed</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
          New Repair Request
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg">
          Tell us about your device and we'll get you a quote within 24 hours
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center mb-12">
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((s) => (
            <Fragment key={s}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                    step >= s
                      ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg scale-110'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step > s ? '✓' : s}
                </div>
                <span className="text-xs mt-2 font-medium text-gray-600 dark:text-gray-400">
                  {s === 1 ? 'Device' : s === 2 ? 'Issue' : 'Review'}
                </span>
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 rounded transition-all duration-300 ${
                    step > s ? 'bg-gradient-to-r from-brand-500 to-brand-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <div className="glass rounded-3xl p-8 md:p-12 shadow-2xl">
        {/* Step 1: Device Selection */}
        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              What type of device needs repair?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(deviceIcons).map(([type, icon]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, deviceType: type })}
                  className={`card-hover p-6 text-center transition-all duration-300 ${
                    formData.deviceType === type
                      ? 'ring-4 ring-brand-500 bg-gradient-to-br from-brand-50 to-accent-50 dark:from-brand-900/30 dark:to-accent-900/30'
                      : ''
                  }`}
                >
                  <div className="text-5xl mb-3">{icon}</div>
                  <div className="font-semibold capitalize text-gray-900 dark:text-white">
                    {type}
                  </div>
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="input"
                  placeholder="e.g., Apple, Samsung, Dell"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="input"
                  placeholder="e.g., iPhone 14, Galaxy S23"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                disabled={!formData.deviceType}
                className="btn btn-primary px-8"
              >
                Next: Describe Issue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Issue Description */}
        {step === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              What's wrong with your {formData.deviceType}?
            </h2>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Issue Description
              </label>
              <textarea
                value={formData.issueDescription}
                onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                className="input h-32 resize-y"
                placeholder="Please describe the problem in detail. For example: Screen cracked after dropping, battery drains quickly, device won't turn on, etc."
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
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {level === 'low' ? '1-2 weeks' : level === 'normal' ? '3-5 days' : 'ASAP'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button onClick={() => setStep(1)} className="btn btn-outline px-8">
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.issueDescription}
                className="btn btn-primary px-8 flex-1"
              >
                Next: Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Review Your Request
            </h2>

            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{deviceIcons[formData.deviceType] || '🔧'}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                      {formData.brand} {formData.model}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><span className="font-semibold">Type:</span> {formData.deviceType}</p>
                      <p><span className="font-semibold">Urgency:</span> <span className="capitalize">{formData.urgency}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-brand-600 dark:text-brand-400 hover:underline text-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="p-6 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-bold text-gray-900 dark:text-white">Issue Description</h4>
                  <button
                    onClick={() => setStep(2)}
                    className="text-brand-600 dark:text-brand-400 hover:underline text-sm"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {formData.issueDescription}
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-accent-50 to-brand-50 dark:from-accent-900/20 dark:to-brand-900/20 rounded-xl p-6 border border-accent-200 dark:border-accent-800">
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">What happens next?</h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-accent-600">✓</span>
                  Our technicians will review your request within 24 hours
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent-600">✓</span>
                  You'll receive a detailed quote with pricing breakdown
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent-600">✓</span>
                  Accept the quote and schedule your repair
                </li>
              </ul>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button onClick={() => setStep(2)} className="btn btn-outline px-8">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary px-8 flex-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span> Submitting...
                  </span>
                ) : (
                  'Submit Request ✓'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
