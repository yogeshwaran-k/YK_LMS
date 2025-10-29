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

  // Enforce attempts and window and duration
  const userId = req.user!.sub;
  const now = new Date();
  const { getEffectiveAssessmentSettings, withinWindow } = await import('../utils/assessments');
  const settings = await getEffectiveAssessmentSettings(parsed.data.assessment_id, userId);
  if (!settings) return res.status(404).json({ error: 'Assessment not found' });
  if (!withinWindow(now, settings.start_at, settings.end_at)) return res.status(403).json({ error: 'Window closed' });
  if (settings.duration_minutes && parsed.data.started_at && parsed.data.elapsed_seconds != null) {
    const startedAt = new Date(parsed.data.started_at);
    const elapsed = Number(parsed.data.elapsed_seconds || 0);
    const diff = (now.getTime() - startedAt.getTime()) / 1000; // seconds wall-clock
    const maxSeconds = (settings.duration_minutes * 60) + 5; // small grace
    if (elapsed > maxSeconds || diff > maxSeconds + 30) {
      return res.status(403).json({ error: 'Duration exceeded' });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .insert([{ user_id: userId, ...parsed.data }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  // Force-stop any active sessions for this assessment/user to prevent further resumes
  await supabaseAdmin
    .from('assessment_sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('assessment_id', parsed.data.assessment_id)
    .eq('status', 'active');

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
    .select('id,created_at,score')
    .eq('user_id', req.user!.sub)
    .eq('assessment_id', assessment_id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  const count = data?.length || 0;
  const latest = data && data[0] ? { score: data[0].score ?? null, created_at: data[0].created_at } : null;
  res.json({ count, latest });
});

// Latest submission with payload for current user
router.get('/mine/latest', async (req, res) => {
  const assessment_id = req.query.assessment_id as string | undefined;
  if (!assessment_id) return res.status(400).json({ error: 'assessment_id required' });
  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .eq('user_id', req.user!.sub)
    .eq('assessment_id', assessment_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'No submissions' });
  res.json(data);
});

export default router;
