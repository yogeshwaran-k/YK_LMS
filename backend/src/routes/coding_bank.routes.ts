import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import { ensureCourseAccessOr403, resolveCourseIdForAssessment } from '../utils/access';

const router = Router();
router.use(authenticate);

// Coding Banks
router.get('/coding-banks', requireRole('admin', 'super_admin'), async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('coding_question_banks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/coding-banks', requireRole('admin', 'super_admin'), async (req, res) => {
  const schema = z.object({ name: z.string().min(1), description: z.string().optional().default('') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('coding_question_banks')
    .insert([{ ...parsed.data }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/coding-banks/:bankId/questions', requireRole('admin', 'super_admin'), async (req, res) => {
  const { bankId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('coding_bank_questions')
    .select('*')
    .eq('bank_id', bankId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/coding-banks/:bankId/questions', requireRole('admin', 'super_admin'), async (req, res) => {
  const { bankId } = req.params;
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    starter_code: z.string().optional().default(''),
    difficulty: z.enum(['easy','medium','hard']).optional().nullable(),
    marks: z.number().int().positive().default(10),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('coding_bank_questions')
    .insert([{ ...parsed.data, bank_id: bankId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Import coding questions from bank into an assessment
router.post('/assessments/:assessmentId/coding-from-bank', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assessmentId } = req.params as any;
  const bodySchema = z.object({
    bank_id: z.string().uuid(),
    count: z.number().int().positive().optional(),
    question_ids: z.array(z.string().uuid()).optional(),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });

  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;

  const { bank_id, count, question_ids } = parsed.data;
  let q = supabaseAdmin.from('coding_bank_questions').select('*').eq('bank_id', bank_id).order('created_at', { ascending: true });
  if (question_ids && question_ids.length) {
    q = q.in('id', question_ids);
  }
  const { data: bankQs, error: e1 } = await q;
  if (e1) return res.status(500).json({ error: e1.message });
  let pick = bankQs || [];
  if (count) pick = pick.slice(0, Math.min(count, pick.length));
  if (pick.length === 0) return res.status(400).json({ error: 'No questions to import' });

  const rows = pick.map((b: any) => ({
    assessment_id: assessmentId,
    title: b.title,
    description: b.description,
    starter_code: b.starter_code ?? '',
    difficulty: b.difficulty ?? null,
    marks: b.marks ?? 10,
  }));

  const { data: inserted, error: e2 } = await supabaseAdmin
    .from('coding_questions')
    .insert(rows)
    .select();
  if (e2) return res.status(500).json({ error: e2.message });
  res.status(201).json(inserted);
});

export default router;
