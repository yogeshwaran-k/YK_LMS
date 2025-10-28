import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import { ensureCourseAccessOr403, resolveCourseIdForAssessment, resolveCourseIdForModule } from '../utils/access';

const router = Router();
router.use(authenticate);

// Coding questions
router.get('/:assessmentId/coding-questions', async (req, res) => {
  const { assessmentId } = req.params;
  // Enforce student visibility
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const { data, error } = await supabaseAdmin
    .from('coding_questions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:assessmentId/coding-questions', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assessmentId } = req.params;
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    marks: z.number().int().optional().default(10),
    time_limit_seconds: z.number().int().optional().default(5),
    memory_limit_mb: z.number().int().optional().default(256),
    starter_code: z.string().optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('coding_questions')
    .insert([{ ...parsed.data, assessment_id: assessmentId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/coding-questions/:questionId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { questionId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('coding_questions')
    .update(req.body)
    .eq('id', questionId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/coding-questions/:questionId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { questionId } = req.params;
  const { error } = await supabaseAdmin
    .from('coding_questions')
    .delete()
    .eq('id', questionId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// Test cases
router.get('/coding-questions/:questionId/test-cases', async (req, res) => {
  const { questionId } = req.params;
  // Resolve assessment from coding question
  const { data: cq, error: e1 } = await supabaseAdmin
    .from('coding_questions')
    .select('assessment_id')
    .eq('id', questionId)
    .maybeSingle();
  if (e1 || !cq) return res.status(404).json({ error: 'Question not found' });
  const courseId = await resolveCourseIdForAssessment((cq as any).assessment_id);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const role = req.user?.role;
  let q = supabaseAdmin
    .from('test_cases')
    .select('*')
    .eq('coding_question_id', questionId)
    .order('created_at', { ascending: true });
  if (role === 'student') {
    q = q.eq('is_hidden', false);
  }
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/coding-questions/:questionId/test-cases', requireRole('admin', 'super_admin'), async (req, res) => {
  const { questionId } = req.params;
  const schema = z.object({
    input: z.string(),
    expected_output: z.string(),
    is_hidden: z.boolean().optional().default(false),
    weightage: z.number().int().optional().default(10),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('test_cases')
    .insert([{ ...parsed.data, coding_question_id: questionId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/test-cases/:testCaseId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { testCaseId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('test_cases')
    .update(req.body)
    .eq('id', testCaseId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/test-cases/:testCaseId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { testCaseId } = req.params;
  const { error } = await supabaseAdmin
    .from('test_cases')
    .delete()
    .eq('id', testCaseId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

router.post('/:assessmentId/coding-questions/bulk', requireRole('admin','super_admin'), async (req, res) => {
  const { assessmentId } = req.params;
  const csv: string = (req.body?.csv as string) || '';
  if (!csv.trim()) return res.status(400).json({ error: 'Missing csv' });
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) return res.status(400).json({ error: 'Empty csv' });
  const headers = header.split(',').map(h=>h.trim().toLowerCase());
  const required = ['title','description'];
  for (const r of required) if (!headers.includes(r)) return res.status(400).json({ error: `Missing column ${r}` });
  const rows = lines.map(line => {
    const cols = line.split(',');
    const get = (name: string) => cols[headers.indexOf(name)]?.trim();
    return {
      assessment_id: assessmentId,
      title: get('title'),
      description: get('description'),
      difficulty: (get('difficulty') || null),
      marks: Number(get('marks')||10) || 10,
      time_limit_seconds: Number(get('time_limit_seconds')||5) || 5,
      memory_limit_mb: Number(get('memory_limit_mb')||256) || 256,
      starter_code: get('starter_code') || '',
    };
  });
  const { error } = await supabaseAdmin.from('coding_questions').insert(rows);
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ inserted: rows.length });
});

export default router;
