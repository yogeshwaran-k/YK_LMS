import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const router = Router();

router.use(authenticate, requireRole('admin', 'super_admin'));

router.get('/', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const upsertSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(['super_admin', 'admin', 'student']),
  is_active: z.boolean().optional().default(true),
  password: z.string().min(6).optional(),
});

router.post('/', async (req, res) => {
  const parsed = upsertSchema.required({ password: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { email, full_name, role, password, is_active } = parsed.data;
  const password_hash = await bcrypt.hash(password!, 10);
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([{ email: email.toLowerCase(), full_name, role, is_active: is_active ?? true, password_hash }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const parsed = upsertSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const update: any = { ...parsed.data };
  if (update.password) {
    update.password_hash = await bcrypt.hash(update.password, 10);
    delete update.password;
  }
  if (update.email) update.email = update.email.toLowerCase();
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(update)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_active: false })
    .eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

export default router;
