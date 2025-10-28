import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const userId = req.user!.sub;
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/', requireRole('admin','super_admin'), async (req, res) => {
  const schema = z.object({ user_id: z.string().uuid(), title: z.string(), body: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin.from('notifications').insert([parsed.data]).select().maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;