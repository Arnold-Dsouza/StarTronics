import React, { useState } from 'react';
import { FormField } from './FormField';

export interface RepairRequestDraft {
  deviceType: string;
  brand?: string;
  model?: string;
  issueDescription: string;
  urgency?: 'low' | 'normal' | 'high';
}

export const RepairRequestForm: React.FC<{ onSubmit?: (data: RepairRequestDraft) => void }> = ({ onSubmit }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const data: RepairRequestDraft = {
      deviceType: String(formData.get('deviceType') || ''),
      brand: String(formData.get('brand') || ''),
      model: String(formData.get('model') || ''),
      issueDescription: String(formData.get('issueDescription') || ''),
      urgency: formData.get('urgency') as any
    };
    try {
      onSubmit?.(data);
    } catch (err: any) {
      setError(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-xl">
      <h2 className="text-lg font-semibold mb-4">New Repair Request</h2>
      <FormField label="Device Type" name="deviceType" placeholder="Laptop / Phone" required />
      <FormField label="Brand" name="brand" placeholder="Brand" />
      <FormField label="Model" name="model" placeholder="Model" />
      <label className="block mb-4">
        <span className="block text-sm font-medium mb-1">Issue Description</span>
        <textarea name="issueDescription" required className="input h-24 resize-y" placeholder="Describe the problem" />
      </label>
      <label className="block mb-4">
        <span className="block text-sm font-medium mb-1">Urgency</span>
        <select name="urgency" className="input">
          <option value="normal">Normal</option>
          <option value="low">Low</option>
          <option value="high">High</option>
        </select>
      </label>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button disabled={loading} className="btn btn-primary w-full" type="submit">
        {loading ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
};
