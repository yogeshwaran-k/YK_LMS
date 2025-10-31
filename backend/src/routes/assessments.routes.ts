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
    disable_copy_paste: z.boolean().optional().default(false),
    tab_switch_limit: z.number().int().nonnegative().optional().nullable(),
    is_practice: z.boolean().optional().default(false),
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

  // Proctoring: compute tab switch usage if active session exists
  let tab_switch_used = 0;
  if (active && session_id) {
    const { count } = await (supabaseAdmin
      .from('assessment_proctor_events')
      .select('id', { count: 'exact', head: true }) as any)
      .eq('session_id', session_id)
      .eq('event_type', 'tab_switch');
    tab_switch_used = (count as number) || 0;
    if ((settings.tab_switch_limit ?? null) !== null && tab_switch_used >= (settings.tab_switch_limit as number)) {
      can_resume = false;
      if (!reasons.includes('tab_switch_limit_exceeded')) reasons.push('tab_switch_limit_exceeded');
    }
  }

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
    proctor: { disable_copy_paste: settings.disable_copy_paste ?? false, tab_switch_limit: settings.tab_switch_limit ?? null, tab_switch_used },
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
  // Proctoring: block resume if tab switch limit reached/exceeded
  const { count: tabCount } = await (supabaseAdmin
    .from('assessment_proctor_events')
    .select('id', { count: 'exact', head: true }) as any)
    .eq('session_id', sessionId)
    .eq('event_type', 'tab_switch');
  const usedTab = (tabCount as number) || 0;
  const tabLimit = settings.tab_switch_limit ?? null;
  if (tabLimit !== null && usedTab >= (tabLimit as number)) {
    await supabaseAdmin
      .from('assessment_sessions')
      .update({ status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('id', sessionId);
    return res.status(403).json({ error: 'Tab Switch Limit Exceeded' });
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

// Proctoring endpoints
router.post('/:assessmentId/sessions/:sessionId/proctor/tab-switch', async (req, res) => {
  const { assessmentId, sessionId } = req.params as any;
  const userId = req.user!.sub;
  // Enforce access
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  // Validate session ownership and status
  const { data: s } = await supabaseAdmin
    .from('assessment_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!s) return res.status(404).json({ error: 'Session not found' });
  // Record event
  await supabaseAdmin
    .from('assessment_proctor_events')
    .insert([{ assessment_id: assessmentId, session_id: sessionId, user_id: userId, event_type: 'tab_switch' }]);
  // Fetch settings and counts
  const { getEffectiveAssessmentSettings } = await import('../utils/assessments');
  const settings = await getEffectiveAssessmentSettings(assessmentId, userId);
  const { count } = await (supabaseAdmin
    .from('assessment_proctor_events')
    .select('id', { count: 'exact', head: true }) as any)
    .eq('session_id', sessionId)
    .eq('event_type', 'tab_switch');
  const used = (count as number) || 0;
  const limit = settings?.tab_switch_limit ?? null;
  const exceeded = limit !== null && used > (limit as number);
  // Optionally lock session if exceeded to prevent further resume
  if (exceeded) {
    await supabaseAdmin
      .from('assessment_sessions')
      .update({ status: 'cancelled', ended_at: new Date().toISOString() })
      .eq('id', sessionId);
  }
  res.json({ used, limit, exceeded });
});

// Live monitoring endpoints
router.post('/:assessmentId/sessions/:sessionId/live', async (req, res) => {
  const { assessmentId, sessionId } = req.params as any;
  const userId = req.user!.sub;
  const { code, last_report } = req.body || {};
  // Ensure session belongs to this user
  const { data: s } = await supabaseAdmin.from('assessment_sessions').select('id,user_id,assessment_id,status').eq('id', sessionId).maybeSingle();
  if (!s || (s as any).user_id !== userId || (s as any).assessment_id !== assessmentId) return res.status(404).json({ error: 'Session not found' });
  if ((s as any).status !== 'active') return res.status(409).json({ error: 'Session not active' });
  const up = { session_id: sessionId, assessment_id: assessmentId, user_id: userId, code: code ?? null, last_report: last_report ?? null, updated_at: new Date().toISOString() } as any;
  await supabaseAdmin.from('assessment_live_snapshots').upsert(up);
  res.json({ ok: true });
});

router.get('/:assessmentId/live', requireRole('admin','super_admin'), async (req, res) => {
  const { assessmentId } = req.params as any;
  const { data: sessions } = await supabaseAdmin
    .from('assessment_sessions').select('id,user_id,started_at,resume_count,status').eq('assessment_id', assessmentId).eq('status', 'active');
  const userIds = Array.from(new Set((sessions||[]).map((s:any)=>s.user_id)));
  const { data: users } = await supabaseAdmin.from('users').select('id,full_name,email').in('id', userIds);
  const { data: snaps } = await supabaseAdmin.from('assessment_live_snapshots').select('*').eq('assessment_id', assessmentId);
  res.json({ sessions: sessions||[], users: users||[], snapshots: snaps||[] });
});

// Per-learner live detail (admin)
router.get('/:assessmentId/sessions/:sessionId/live', requireRole('admin','super_admin'), async (req, res) => {
  const { assessmentId, sessionId } = req.params as any;
  // session
  const { data: s } = await supabaseAdmin
    .from('assessment_sessions')
    .select('id,user_id,assessment_id,status,started_at,resume_count,last_resume_at')
    .eq('id', sessionId)
    .eq('assessment_id', assessmentId)
    .maybeSingle();
  if (!s) return res.status(404).json({ error: 'Session not found' });
  const { data: u } = await supabaseAdmin.from('users').select('id,full_name,email').eq('id', (s as any).user_id).maybeSingle();
  const { data: snap } = await supabaseAdmin.from('assessment_live_snapshots').select('*').eq('session_id', sessionId).maybeSingle();
  // proctor summary
  const { count: tabCount } = await (supabaseAdmin
    .from('assessment_proctor_events')
    .select('id', { count: 'exact', head: true }) as any)
    .eq('session_id', sessionId)
    .eq('event_type', 'tab_switch');
  res.json({ session: s, user: u, snapshot: snap || null, proctor: { tab_switches: (tabCount as number) || 0 } });
});

// Force submit (admin)
router.post('/:assessmentId/sessions/:sessionId/force-submit', requireRole('admin','super_admin'), async (req, res) => {
  const { assessmentId, sessionId } = req.params as any;
  // fetch live snapshot
  const { data: snap } = await supabaseAdmin
    .from('assessment_live_snapshots')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  // finish the session
  await supabaseAdmin.from('assessment_sessions').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', sessionId);
  // if coding and snapshot exists, persist as a submission
  if (snap && (snap as any).last_report) {
    const report = (snap as any).last_report as any[];
    const score = Array.isArray(report) ? report.filter(r=>r.status==='Pass').length : null;
    await supabaseAdmin.from('submissions').insert([{ assessment_id: assessmentId, user_id: (snap as any).user_id, type: 'coding', payload: { code: (snap as any).code, report }, score }]);
  }
  res.json({ ok: true });
});

// Start-or-resume: clears stale active and starts new
router.post('/:assessmentId/start-or-resume', async (req, res) => {
  const { assessmentId } = req.params as any;
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;

  const userId = req.user!.sub;
  const { getEffectiveAssessmentSettings, getActiveSession, withinWindow, remainingSeconds } = await import('../utils/assessments');
  const settings = await getEffectiveAssessmentSettings(assessmentId, userId);
  if (!settings) return res.status(404).json({ error: 'Assessment not found' });
  const now = new Date();
  if (!withinWindow(now, settings.start_at, settings.end_at)) return res.status(403).json({ error: 'Window closed' });

  let active = await getActiveSession(assessmentId, userId);
  if (active) {
    const rem = remainingSeconds(now, (active as any).started_at, settings.duration_minutes, settings.end_at);
    const limit = settings.resume_limit ?? 0;
    const nextResumeCount = ((active as any).resume_count ?? 0) + 1;
    const resumeExceeded = nextResumeCount > limit;
    if (rem > 0 && !resumeExceeded) {
      return res.json({ resumed: true, session_id: (active as any).id });
    }
    await supabaseAdmin.from('assessment_sessions').update({ status: rem <= 0 ? 'completed' : 'cancelled', ended_at: now.toISOString() }).eq('id', (active as any).id);
    active = null;
  }
  const { data, error } = await supabaseAdmin.from('assessment_sessions').insert([{ assessment_id: assessmentId, user_id: userId, status: 'active' }]).select().maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ resumed: false, session_id: (data as any).id });
});

// Get session status
router.get('/:assessmentId/sessions/:sessionId', async (req, res) => {
  const { assessmentId, sessionId } = req.params as any;
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const { data, error } = await supabaseAdmin
    .from('assessment_sessions')
    .select('id,status,started_at,ended_at,resume_count,last_resume_at')
    .eq('id', sessionId)
    .eq('assessment_id', assessmentId)
    .eq('user_id', req.user!.sub)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Session not found' });
  res.json(data);
});

// Proctoring summary for a session
router.get('/:assessmentId/sessions/:sessionId/proctor', async (req, res) => {
  const { assessmentId, sessionId } = req.params as any;
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const { count: tabCount } = await (supabaseAdmin
    .from('assessment_proctor_events')
    .select('id', { count: 'exact', head: true }) as any)
    .eq('session_id', sessionId)
    .eq('event_type', 'tab_switch');
  res.json({ tab_switches: (tabCount as number) || 0 });
});

export default router;
