import { supabase } from './supabaseClient';

export interface RepairRequest {
  id: string;
  user_id: string;
  device_id: string;
  title: string;
  description: string;
  status: string;
  urgency: string;
  created_at: string;
  updated_at: string;
  technician_notes?: string;
  devices?: {
    id: string;
    type: string;
    brand?: string;
    model?: string;
  };
}

export async function apiCreateRepairRequest(data: {
  deviceType: string;
  brand?: string;
  model?: string;
  issueDescription: string;
  urgency: 'low' | 'normal' | 'high';
  userId: string;
}): Promise<RepairRequest> {
  // 1) Create device owned by the user
  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .insert({
      user_id: data.userId,
      type: data.deviceType,
      brand: data.brand || null,
      model: data.model || null,
    })
    .select()
    .single();

  if (deviceError || !device) {
    throw new Error(deviceError?.message || 'Failed to create device');
  }

  // 2) Create repair request linked to device
  const title = `${data.deviceType} - ${data.issueDescription.substring(0, 50)}`;
  const { data: request, error: requestError } = await supabase
    .from('repair_requests')
    .insert({
      user_id: data.userId,
      device_id: device.id,
      title,
      description: data.issueDescription,
      status: 'pending',
      urgency: data.urgency,
    })
    .select(`
      *,
      devices (
        id,
        type,
        brand,
        model
      )
    `)
    .single();

  if (requestError || !request) {
    throw new Error(requestError?.message || 'Failed to create repair request');
  }

  return request as unknown as RepairRequest;
}

export async function apiListRepairRequests(userId: string): Promise<RepairRequest[]> {
  const { data, error } = await supabase
    .from('repair_requests')
    .select(`
      *,
      devices (
        id,
        type,
        brand,
        model
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Failed to fetch repair requests');
  }

  return (data || []) as unknown as RepairRequest[];
}

export async function apiGetRepairRequest(userId: string, id: string): Promise<RepairRequest> {
  const { data, error } = await supabase
    .from('repair_requests')
    .select(`
      *,
      devices (
        id,
        type,
        brand,
        model
      )
    `)
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to fetch repair request');
  }

  return data as unknown as RepairRequest;
}

export async function apiUpdateRepairRequest(userId: string, id: string, data: {
  description?: string;
  urgency?: 'low' | 'normal' | 'high';
}): Promise<RepairRequest> {
  const { data: updated, error } = await supabase
    .from('repair_requests')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
    .select(`
      *,
      devices (
        id,
        type,
        brand,
        model
      )
    `)
    .single();

  if (error || !updated) {
    throw new Error(error?.message || 'Failed to update repair request');
  }

  return updated as unknown as RepairRequest;
}

export async function apiDeleteRepairRequest(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('repair_requests')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to delete repair request');
  }
}
