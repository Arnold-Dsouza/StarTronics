import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { createSupabaseClient } from './supabase.js';

dotenv.config();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// Basic health route
app.get('/health', async () => ({ status: 'ok', service: 'startronics-backend', version: '0.1.0' }));

// Simple environment validation
const envSchema = z.object({
  PORT: z.string().default('4000'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars for security'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20)
});
const env = envSchema.parse(process.env);

// Initialize Supabase client (service role for backend operations)
const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// DB health route - counts tables quickly
app.get('/db/health', async () => {
  try {
    const { count, error } = await supabase
      .from('repair_requests')
      .select('id', { count: 'exact', head: true });
    if (error) {
      return { status: 'error', error: error.message };
    }
    return { status: 'ok', table: 'repair_requests', count: count ?? 0 };
  } catch (e: any) {
    return { status: 'error', error: e.message };
  }
});

// Repair Request Endpoints
const createRepairRequestSchema = z.object({
  deviceType: z.string(),
  brand: z.string().optional(),
  model: z.string().optional(),
  issueDescription: z.string(),
  urgency: z.enum(['low', 'normal', 'high']).default('normal'),
  userId: z.string().uuid()
});

app.post('/repair-requests', async (request, reply) => {
  try {
    const body = createRepairRequestSchema.parse(request.body);
    
    // Create device record first
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .insert({
        user_id: body.userId,
        type: body.deviceType,
        brand: body.brand || null,
        model: body.model || null
      })
      .select()
      .single();
    
    if (deviceError) {
      return reply.status(400).send({ error: deviceError.message });
    }
    
    // Create repair request
    const { data: repairRequest, error: requestError } = await supabase
      .from('repair_requests')
      .insert({
        user_id: body.userId,
        device_id: device.id,
        title: `${body.deviceType} - ${body.issueDescription.substring(0, 50)}`,
        description: body.issueDescription,
        status: 'pending',
        urgency: body.urgency
      })
      .select()
      .single();
    
    if (requestError) {
      return reply.status(400).send({ error: requestError.message });
    }
    
    return reply.status(201).send(repairRequest);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ error: 'Invalid request data', details: err.errors });
    }
    return reply.status(500).send({ error: err.message });
  }
});

app.get('/repair-requests/:userId', async (request, reply) => {
  try {
    const { userId } = request.params as { userId: string };
    
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
      return reply.status(400).send({ error: error.message });
    }
    
    return reply.send(data || []);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

app.get('/repair-requests/:userId/:id', async (request, reply) => {
  try {
    const { userId, id } = request.params as { userId: string; id: string };
    
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
    
    if (error) {
      return reply.status(404).send({ error: 'Repair request not found' });
    }
    
    return reply.send(data);
  } catch (err: any) {
    return reply.status(500).send({ error: err.message });
  }
});

app.listen({ port: Number(env.PORT), host: '0.0.0.0' })
  .then(() => {
    app.log.info(`Backend running on http://localhost:${env.PORT}`);
  })
  .catch(err => {
    app.log.error(err);
    process.exit(1);
  });
