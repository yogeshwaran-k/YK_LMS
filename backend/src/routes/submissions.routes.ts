import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import { resolveCourseIdForAssessment, ensureCourseAccessOr403 } from '../utils/access';

const router = Router();
router.use(authenticate);

const schema = z.object({
  assessment_id: z.string().uuid(),
  type: z.enum(['mcq','coding','assignment']),
  score: z.number().int().optional(),
  payload: z.any().optional(),
  language: z.string().optional(),
  started_at: z.string().datetime().optional(),
  elapsed_seconds: z.number().int().optional(),
  question_ids: z.array(z.string()).optional(),
});

router.post('/', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  // Enforce student visibility: user must have access to the assessment's course
  const courseId = await resolveCourseIdForAssessment(parsed.data.assessment_id);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .insert([{ user_id: req.user!.sub, ...parsed.data }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/', async (req, res) => {
  // Admin-only visibility
  const role = req.user?.role;
  if (!(role === 'admin' || role === 'super_admin')) return res.status(403).json({ error: 'Forbidden' });
  const assessmentId = req.query.assessment_id as string | undefined;
  let q = supabaseAdmin.from('submissions').select('*').order('created_at', { ascending: false });
  if (assessmentId) q = q.eq('assessment_id', assessmentId);
  const { data, error } = await q.limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.get('/mine', async (req, res) => {
  const assessment_id = req.query.assessment_id as string | undefined;
  if (!assessment_id) return res.status(400).json({ error: 'assessment_id required' });
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('id,created_at')
    .eq('user_id', req.user!.sub)
    .eq('assessment_id', assessment_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: data?.length || 0 });
});

export default router;
