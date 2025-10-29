import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import { resolveCourseIdForModule, ensureCourseAccessOr403, resolveCourseIdForAssessment } from '../utils/access';

const router = Router();

router.use(authenticate);

router.get('/modules/:moduleId', async (req, res) => {
  const { moduleId } = req.params;
  // Enforce student visibility by resolving course from module
  const courseId = await resolveCourseIdForModule(moduleId);
  if (!courseId) return res.status(404).json({ error: 'Module not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select('*')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/modules/:moduleId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { moduleId } = req.params;
  const schema = z.object({
    title: z.string().min(1),
    type: z.enum(['mcq', 'coding', 'assignment']),
    description: z.string().optional().default(''),
    duration_minutes: z.number().int().nonnegative().optional().default(60),
    total_marks: z.number().int().nonnegative().optional().default(100),
    passing_marks: z.number().int().nonnegative().optional().default(40),
    randomize_questions: z.boolean().optional().default(false),
    enable_negative_marking: z.boolean().optional().default(false),
    negative_marks_per_question: z.number().optional().default(0),
    show_results_immediately: z.boolean().optional().default(false),
    start_at: z.string().datetime().optional().nullable(),
    end_at: z.string().datetime().optional().nullable(),
    deadline: z.string().datetime().optional().nullable(),
    allowed_languages: z.array(z.enum(['javascript','python','cpp','c','java','typescript'])).optional(),
    allowed_attempts: z.number().int().positive().optional().default(1),
    resume_limit: z.number().int().nonnegative().optional().default(0),
    results_release_at: z.string().datetime().optional().nullable(),
    results_force_enabled: z.boolean().optional().default(false),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const payload = { ...parsed.data, deadline: parsed.data.deadline ?? null, start_at: parsed.data.start_at ?? null, end_at: parsed.data.end_at ?? null, results_release_at: (parsed.data as any).results_release_at ?? null } as any;
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .insert([{ ...payload, module_id: moduleId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:assessmentId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assessmentId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .update(req.body)
    .eq('id', assessmentId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:assessmentId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assessmentId } = req.params;
  const { error } = await supabaseAdmin
    .from('assessments')
    .delete()
    .eq('id', assessmentId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// Eligibility and session management
router.get('/:assessmentId/eligibility', async (req, res) => {
  const { assessmentId } = req.params;
  // Enforce access
  let courseId = await resolveCourseIdForAssessment(assessmentId);
  let enforceAccess = true;
  if (!courseId) {
    // Try to proceed even if module->course resolution is missing
    enforceAccess = false;
  }
  if (enforceAccess) {
    const ok = await ensureCourseAccessOr403(req, res, courseId!);
    if (!ok) return;
  }

  const userId = req.user!.sub;
  const now = new Date();

  const { getEffectiveAssessmentSettings, getUserAttemptCount, getActiveSession, withinWindow, remainingSeconds } = await import('../utils/assessments');
  const settings = await getEffectiveAssessmentSettings(assessmentId, userId);
  if (!settings) {
    return res.json({
      eligible: false,
      reasons: ['not_found'],
      attempts: { used: 0, allowed: 0 },
      resume: { used: 0, allowed: 0 },
      window: { start_at: null, end_at: null, now: new Date().toISOString() },
      duration_minutes: null,
      can_start: false,
      can_resume: false,
      session_id: null,
      remaining_seconds: null,
    });
  }

  const attempts_used = await getUserAttemptCount(assessmentId, userId);
  let active = await getActiveSession(assessmentId, userId);
  const window_ok = withinWindow(now, settings.start_at, settings.end_at);
  const attempts_ok = attempts_used < (settings.allowed_attempts ?? 1);
  const before_start = settings.start_at ? now < new Date(settings.start_at) : false;
  const after_end = settings.end_at ? now > new Date(settings.end_at) : false;

  // If there is an expired active session, auto-complete it so the learner can start again
  if (active) {
    const rem = remainingSeconds(now, (active as any).started_at, settings.duration_minutes, settings.end_at);
    if (rem <= 0) {
      await supabaseAdmin
        .from('assessment_sessions')
        .update({ status: 'completed', ended_at: now.toISOString() })
        .eq('id', (active as any).id);
      active = null;
    }
  }

  let can_start = window_ok && attempts_ok && !active;
  let can_resume = false;
  let remaining_seconds = null as number | null;
  let session_id = null as string | null;
  if (active) {
    session_id = (active as any).id;
    const rem = remainingSeconds(now, (active as any).started_at, settings.duration_minutes, settings.end_at);
    remaining_seconds = rem;
    const limit = settings.resume_limit ?? 0;
    const nextResumeCount = ((active as any).resume_count ?? 0) + 1;
    const resumeExceeded = nextResumeCount > limit;
    can_resume = window_ok && rem > 0 && !resumeExceeded;
  }

  const reasons: string[] = [];
  if (!window_ok) reasons.push(before_start ? 'before_start' : 'after_end');
  if (!attempts_ok) reasons.push('attempts_exhausted');
  if (active && remaining_seconds && remaining_seconds > 0) {
    const limit = settings.resume_limit ?? 0;
    const nextResumeCount = ((active as any).resume_count ?? 0) + 1;
    const resumeExceeded = nextResumeCount > limit;
    if (resumeExceeded) reasons.push('resume_count_exceeded');
  }
  if (active && !can_resume && !(reasons.includes('resume_count_exceeded'))) reasons.push('active_session_exists');

  const eligible = can_start || can_resume;

  res.json({
    eligible,
    reasons: eligible ? [] : reasons,
    attempts: { used: attempts_used, allowed: settings.allowed_attempts ?? 1 },
    resume: { used: active?.resume_count ?? 0, allowed: settings.resume_limit ?? 0 },
    window: { start_at: settings.start_at, end_at: settings.end_at, now: now.toISOString() },
    duration_minutes: settings.duration_minutes,
    can_start,
    can_resume,
    session_id,
    remaining_seconds,
  });
});

router.post('/:assessmentId/start', async (req, res) => {
  const { assessmentId } = req.params;
  // Enforce access
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;

  const userId = req.user!.sub;
  const now = new Date();
  const { getEffectiveAssessmentSettings, getUserAttemptCount, getActiveSession, withinWindow, remainingSeconds } = await import('../utils/assessments');
  const settings = await getEffectiveAssessmentSettings(assessmentId, userId);
  if (!settings) return res.status(404).json({ error: 'Assessment not found' });
  const windowOk = withinWindow(now, settings.start_at, settings.end_at);
  if (!windowOk) {
    if (settings.start_at && now < new Date(settings.start_at)) return res.status(403).json({ error: `Start Time is at ${settings.start_at}` });
    if (settings.end_at && now > new Date(settings.end_at)) return res.status(403).json({ error: `The End has end at ${settings.end_at}` });
    return res.status(403).json({ error: 'Window closed' });
  }
  const attempts_used = await getUserAttemptCount(assessmentId, userId);
  if (attempts_used >= (settings.allowed_attempts ?? 1)) return res.status(403).json({ error: 'Attempts Exhausted' });
  let active = await getActiveSession(assessmentId, userId);
  if (active) {
    const rem = remainingSeconds(now, (active as any).started_at, settings.duration_minutes, settings.end_at);
    const limit = settings.resume_limit ?? 0;
    const hasResumedBefore = !!(active as any).last_resume_at;
    const nextResumeCount = ((active as any).resume_count ?? 0) + 1;
    const resumeExceeded = nextResumeCount > limit;
    if (rem <= 0 || (resumeExceeded && hasResumedBefore)) {
      await supabaseAdmin
        .from('assessment_sessions')
        .update({ status: rem <= 0 ? 'completed' : 'cancelled', ended_at: now.toISOString() })
        .eq('id', (active as any).id);
      active = null;
    }
  }
  if (active) return res.status(409).json({ error: 'Active session exists', session_id: (active as any).id });
  const { data, error } = await supabaseAdmin
    .from('assessment_sessions')
    .insert([{ assessment_id: assessmentId, user_id: userId, status: 'active' }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.post('/:assessmentId/sessions/:sessionId/resume', async (req, res) => {
  const { assessmentId, sessionId } = req.params as any;
  const userId = req.user!.sub;
  // Enforce access
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;

  const { getEffectiveAssessmentSettings, withinWindow } = await import('../utils/assessments');
  const settings = await getEffectiveAssessmentSettings(assessmentId, userId);
  if (!settings) return res.status(404).json({ error: 'Assessment not found' });

  const now = new Date();
  const windowOk = withinWindow(now, settings.start_at, settings.end_at);
  if (!windowOk) {
    if (settings.start_at && now < new Date(settings.start_at)) return res.status(403).json({ error: `Start Time is at ${settings.start_at}` });
    if (settings.end_at && now > new Date(settings.end_at)) return res.status(403).json({ error: `The End has end at ${settings.end_at}` });
    return res.status(403).json({ error: 'Window closed' });
  }

  const { data: s, error: e1 } = await supabaseAdmin
    .from('assessment_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (e1 || !s) return res.status(404).json({ error: 'Session not found' });
  if (s.status !== 'active') return res.status(409).json({ error: 'Session not active' });

  const limit = settings.resume_limit ?? 0;
  const nextResumeCount = (s.resume_count ?? 0) + 1;
  if (nextResumeCount > limit) {
    // When resume count would exceed limit, block and close this attempt session to allow a fresh attempt.
    await supabaseAdmin
      .from('assessment_sessions')
      .update({ status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('id', sessionId);
    return res.status(403).json({ error: 'Resume Count Exceeded' });
  }

  const { data, error } = await supabaseAdmin
    .from('assessment_sessions')
    .update({ resume_count: nextResumeCount, last_resume_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:assessmentId/sessions/:sessionId/finish', async (req, res) => {
  const { assessmentId, sessionId } = req.params as any;
  const userId = req.user!.sub;
  // Enforce access
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;

  const { data: s, error: e1 } = await supabaseAdmin
    .from('assessment_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (e1 || !s) return res.status(404).json({ error: 'Session not found' });
  // Make finish idempotent: if already not active, just return current session
  if (s.status !== 'active') return res.json(s);
  const { data, error } = await supabaseAdmin
    .from('assessment_sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
