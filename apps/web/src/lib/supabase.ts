import { createClient } from '@/utils/supabase/client'

export type BatchStatus = 'active' | 'warn' | 'idle'

export interface Batch {
  id: string
  name: string
  type: string
  volume: number
  yeast: string | null
  density: number | null
  ph: number | null
  temp: number | null
  day: number
  progress: number
  status: BatchStatus
  alert: string | null
  created_at: string
  updated_at: string
}

export interface Sample {
  id: string
  batch_id: string
  type: string | null
  notes: string | null
  ph: number | null
  density: number | null
  img_url: string | null
  analysis: string | null
  created_at: string
}

export interface Activity {
  id: string
  batch_id: string | null
  time_label: string | null
  text: string
  sub: string | null
  color: string | null
  created_at: string
}

export function getSupabase() {
  return createClient()
}

export async function fetchBatches(): Promise<Batch[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('batches')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchActivity(): Promise<Activity[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return data || []
}

export async function fetchSamples(): Promise<Sample[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('samples')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data || []
}

export async function createBatch(batch: Omit<Batch, 'created_at' | 'updated_at'>): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('batches').insert(batch)
  if (error) throw error
}

export async function updateBatch(id: string, updates: Partial<Batch>): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb
    .from('batches')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function createSample(sample: Omit<Sample, 'id' | 'created_at'>): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.from('samples').insert(sample)
  if (error) throw error
}

export async function logActivity(
  batchId: string | null,
  text: string,
  sub: string,
  color = 'var(--green)'
): Promise<void> {
  const sb = getSupabase()
  const timeLabel = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  await sb.from('activity').insert({ batch_id: batchId, time_label: timeLabel, text, sub, color })
}
