import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';

const router = Router();
router.use(authenticate, requireRole('admin', 'super_admin'));

router.get('/', async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('groups').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/', async (req, res) => {
  const schema = z.object({ name: z.string().min(1), description: z.string().optional().default('') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin.from('groups').insert([{ name: parsed.data.name, description: parsed.data.description }]).select().maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('groups').update(req.body).eq('id', id).select().maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin.from('groups').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

router.get('/:id/members', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('group_members').select('user_id').eq('group_id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data?.map(r=>r.user_id) || []);
});

router.post('/:id/members', async (req, res) => {
  const { id } = req.params;
  const schema = z.object({ user_ids: z.array(z.string().uuid()).min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const rows = parsed.data.user_ids.map(uid => ({ group_id: id, user_id: uid }));
  const { error } = await supabaseAdmin.from('group_members').upsert(rows, { onConflict: 'group_id,user_id' });
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

router.delete('/:id/members/:userId', async (req, res) => {
  const { id, userId } = req.params;
  const { error } = await supabaseAdmin.from('group_members').delete().eq('group_id', id).eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

export default router;