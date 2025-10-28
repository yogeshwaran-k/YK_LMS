import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { supabaseAdmin } from '../supabase';
import { ensureCourseAccessOr403, resolveCourseIdForLesson } from '../utils/access';

const router = Router();
router.use(authenticate);

router.post('/lessons/:lessonId/tick', async (req, res) => {
  const { lessonId } = req.params;
  // Enforce that the lesson belongs to a course the student can access
  const courseId = await resolveCourseIdForLesson(lessonId);
  if (!courseId) return res.status(404).json({ error: 'Lesson not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const userId = req.user!.sub;
  const seconds = Number(req.body?.seconds ?? 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return res.status(400).json({ error: 'Invalid seconds' });
  const { data: existing } = await supabaseAdmin
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  const total_seconds = (existing?.total_seconds ?? 0) + seconds;
  const { error } = await supabaseAdmin
    .from('lesson_progress')
    .upsert([{ user_id: userId, lesson_id: lessonId, total_seconds }], { onConflict: 'user_id,lesson_id' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ total_seconds });
});

router.get('/lessons/:lessonId', async (req, res) => {
  const { lessonId } = req.params;
  // Enforce course access
  const courseId = await resolveCourseIdForLesson(lessonId);
  if (!courseId) return res.status(404).json({ error: 'Lesson not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const userId = req.user!.sub;
  const { data, error } = await supabaseAdmin
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  if (error) {
    // Gracefully fallback if table missing or other read error
    if ((error.message || '').toLowerCase().includes('lesson_progress')) {
      return res.json({ total_seconds: 0 });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? { total_seconds: 0 });
});

export default router;
