import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

router.get('/:assessmentId/assignment', async (req, res) => {
  const { assessmentId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('assignments')
    .select('*')
    .eq('assessment_id', assessmentId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:assessmentId/assignment', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assessmentId } = req.params;
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    max_file_size_mb: z.number().int().positive().optional().default(10),
    allowed_file_types: z.array(z.string()).optional().default(['pdf', 'doc', 'docx', 'txt', 'zip']),
    deadline: z.string().datetime().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const payload = { ...parsed.data, deadline: parsed.data.deadline ?? null } as any;
  const { data, error } = await supabaseAdmin
    .from('assignments')
    .insert([{ ...payload, assessment_id: assessmentId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/assignment/:assignmentId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assignmentId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('assignments')
    .update(req.body)
    .eq('id', assignmentId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/assignment/:assignmentId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assignmentId } = req.params;
  const { error } = await supabaseAdmin
    .from('assignments')
    .delete()
    .eq('id', assignmentId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

export default router;
