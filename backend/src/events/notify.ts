import type { Response } from 'express';
import { supabaseAdmin } from '../supabase';

const clients = new Map<string, Set<Response>>();

function send(userId: string, event: string, data: any) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) {
    try { res.write(payload); } catch {}
  }
}

export function registerClient(userId: string, res: Response) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);
  // initial push of unread count
  void pushUnread(userId);
  res.on('close', () => {
    try { clients.get(userId)?.delete(res); } catch {}
  });
}

export function pushNew(userId: string, n: { id?: string; title: string; body: string; created_at?: string }) {
  send(userId, 'new', { id: n.id, title: n.title, body: n.body, created_at: n.created_at || new Date().toISOString() });
}

export async function pushUnread(userId: string) {
  const { count } = await (supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }) as any)
    .eq('user_id', userId)
    .is('read_at', null);
  send(userId, 'unread', { count: (count as number) || 0 });
}