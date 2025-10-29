import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import { ensureCourseAccessOr403, resolveCourseIdForAssessment } from '../utils/access';

const router = Router();
router.use(authenticate);

// Question Banks
router.get('/mcq-banks', requireRole('admin', 'super_admin'), async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('mcq_question_banks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/mcq-banks', requireRole('admin', 'super_admin'), async (req, res) => {
  const schema = z.object({ name: z.string().min(1), description: z.string().optional().default('') });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('mcq_question_banks')
    .insert([{ ...parsed.data }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/mcq-banks/:bankId/questions', requireRole('admin', 'super_admin'), async (req, res) => {
  const { bankId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('mcq_bank_questions')
    .select('*')
    .eq('bank_id', bankId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/mcq-banks/:bankId/questions', requireRole('admin', 'super_admin'), async (req, res) => {
  const { bankId } = req.params;
  const schema = z.object({
    question_text: z.string().min(1),
    option_a: z.string(),
    option_b: z.string(),
    option_c: z.string(),
    option_d: z.string(),
    correct_option: z.enum(['a','b','c','d']),
    marks: z.number().int().positive().default(1),
    difficulty: z.enum(['easy','medium','hard']).optional().nullable(),
    topic: z.string().optional().nullable(),
    explanation: z.string().optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('mcq_bank_questions')
    .insert([{ ...parsed.data, bank_id: bankId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Build an assessment's MCQs from a bank
router.post('/assessments/:assessmentId/from-bank', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assessmentId } = req.params as any;
  const bodySchema = z.object({
    bank_id: z.string().uuid(),
    mode: z.enum(['manual','random']).default('random'),
    count: z.number().int().positive().optional(),
    question_ids: z.array(z.string().uuid()).optional(),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });

  // Enforce access via course
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;

  const { bank_id, mode, count, question_ids } = parsed.data;
  let q = supabaseAdmin.from('mcq_bank_questions').select('*').eq('bank_id', bank_id).order('created_at', { ascending: true });
  if (mode === 'manual' && question_ids && question_ids.length) {
    q = q.in('id', question_ids);
  }
  const { data: bankQs, error: e1 } = await q;
  if (e1) return res.status(500).json({ error: e1.message });

  let pick = bankQs || [];
  if (mode === 'random') {
    const n = Math.min(count || pick.length, pick.length);
    pick = shuffle(pick).slice(0, n);
  }
  if (pick.length === 0) return res.status(400).json({ error: 'No questions to import' });

  const rows = pick.map((b: any) => ({
    assessment_id: assessmentId,
    question_text: b.question_text,
    option_a: b.option_a,
    option_b: b.option_b,
    option_c: b.option_c,
    option_d: b.option_d,
    correct_option: b.correct_option,
    marks: b.marks ?? 1,
    difficulty: b.difficulty ?? null,
    topic: b.topic ?? null,
    explanation: b.explanation ?? '',
  }));

  const { data: inserted, error: e2 } = await supabaseAdmin
    .from('mcq_questions')
    .insert(rows)
    .select();
  if (e2) return res.status(500).json({ error: e2.message });
  res.status(201).json(inserted);
});

function shuffle(arr: any[]) { const a = [...arr]; for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

export default router;
