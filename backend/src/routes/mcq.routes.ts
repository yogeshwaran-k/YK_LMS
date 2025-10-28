import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import { ensureCourseAccessOr403, resolveCourseIdForAssessment } from '../utils/access';

const router = Router();
router.use(authenticate);

router.get('/:assessmentId/mcq-questions', async (req, res) => {
  const { assessmentId } = req.params;
  // Enforce student visibility
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const role = req.user?.role;
  let q = supabaseAdmin
    .from('mcq_questions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: true });
  if (role === 'student') {
    // Students should not see explanations until submission if controlled elsewhere; for baseline RBAC keep full record
    // If needed later, select only public fields here.
  }
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:assessmentId/mcq-questions', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assessmentId } = req.params;
  const schema = z.object({
    question_text: z.string().min(1),
    option_a: z.string(),
    option_b: z.string(),
    option_c: z.string(),
    option_d: z.string(),
    correct_option: z.enum(['a', 'b', 'c', 'd']),
    marks: z.number().int().optional().default(1),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    topic: z.string().optional(),
    explanation: z.string().optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('mcq_questions')
    .insert([{ ...parsed.data, assessment_id: assessmentId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/mcq-questions/:questionId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { questionId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('mcq_questions')
    .update(req.body)
    .eq('id', questionId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/mcq-questions/:questionId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { questionId } = req.params;
  const { error } = await supabaseAdmin
    .from('mcq_questions')
    .delete()
    .eq('id', questionId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

export default router;
