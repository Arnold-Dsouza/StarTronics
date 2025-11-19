// Shared domain types for StarTronics MVP

export type UserRole = 'customer' | 'technician' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  userId: string;
  type: string; // phone, laptop, etc.
  brand?: string;
  model?: string;
  serialEncrypted?: string;
  createdAt: string;
}

export type RepairStatus = 'new' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export interface RepairRequest {
  id: string;
  userId: string;
  deviceId: string;
  issueDescription: string;
  photoUrls?: string[];
  urgency?: 'low' | 'normal' | 'high';
  status: RepairStatus;
  createdAt: string;
  updatedAt: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export interface Quote {
  id: string;
  repairRequestId: string;
  technicianId: string;
  partsCost: number;
  laborCost: number;
  total: number;
  currency: string;
  notes?: string;
  status: QuoteStatus;
  expiresAt?: string;
  createdAt: string;
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export interface Payment {
  id: string;
  userId: string;
  quoteId: string;
  amount: number;
  currency: string;
  provider: 'stripe';
  providerRef?: string;
  status: PaymentStatus;
  capturedAt?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  repairRequestId?: string;
  participantIds: string[];
  channelType: 'chat' | 'video';
  lastMessageAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  sentAt: string;
}

export interface TechnicianProfile {
  id: string;
  userId: string;
  certifications?: string[];
  rating?: number;
  bio?: string;
  serviceRegions?: string[];
}
