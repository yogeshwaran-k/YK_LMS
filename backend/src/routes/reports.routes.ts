import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';

const router = Router();
router.use(authenticate);

router.get('/courses/:courseId.csv', requireRole('admin', 'super_admin'), async (req, res) => {
  const { courseId } = req.params;
  const { data: modules } = await supabaseAdmin.from('modules').select('id,title').eq('course_id', courseId);
  const { data: assigns } = await supabaseAdmin.from('course_assignments').select('user_id').eq('course_id', courseId);
  const userIds = assigns?.map(a => a.user_id) || [];
  const { data: users } = await supabaseAdmin.from('users').select('id,full_name,email').in('id', userIds);
  // naive aggregation of lesson progress
  const { data: lessons } = await supabaseAdmin.from('lessons').select('id,module_id').in('module_id', modules?.map(m=>m.id)||[]);
  const lessonIds = lessons?.map(l => l.id) || [];
  const { data: progresses } = await supabaseAdmin.from('lesson_progress').select('user_id,lesson_id,total_seconds').in('lesson_id', lessonIds);

  const rows = (users||[]).map(u => {
    const userProg = (progresses||[]).filter(p=>p.user_id===u.id);
    const seconds = userProg.reduce((s,p)=>s+(p.total_seconds||0),0);
    return { name: u.full_name, email: u.email, total_seconds: seconds };
  });

  const csv = ['Name,Email,TotalSeconds', ...rows.map(r=>`${wrap(r.name)},${wrap(r.email)},${r.total_seconds}`)].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="course_${courseId}.csv"`);
  res.send(csv);
});

// Student-wise aggregated JSON report (courses progress + assessments)
router.get('/student/:userId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { userId } = req.params as any;
  // Courses assigned to student
  const { data: assigns } = await supabaseAdmin.from('course_assignments').select('course_id').eq('user_id', userId);
  const courseIds = (assigns||[]).map(a=>a.course_id);
  const { data: courses } = await supabaseAdmin.from('courses').select('id,title').in('id', courseIds);
  // Progress per course (sum lesson seconds for lessons under course modules)
  const { data: modules } = await supabaseAdmin.from('modules').select('id,course_id').in('course_id', courseIds);
  const moduleIds = (modules||[]).map(m=>m.id);
  const { data: lessons } = await supabaseAdmin.from('lessons').select('id,module_id').in('module_id', moduleIds);
  const lessonIds = (lessons||[]).map(l=>l.id);
  const { data: progresses } = await supabaseAdmin.from('lesson_progress').select('lesson_id,total_seconds').eq('user_id', userId).in('lesson_id', lessonIds);
  const secondsByCourse: Record<string, number> = {};
  for (const l of (lessons||[])) {
    const sec = (progresses||[]).filter(p=>p.lesson_id===l.id).reduce((s,p)=>s+(p.total_seconds||0),0);
    const cid = (modules||[]).find(m=>m.id===l.module_id)?.course_id; if (!cid) continue;
    secondsByCourse[cid] = (secondsByCourse[cid]||0) + sec;
  }
  // Assessments and submissions for the student
  const { data: subs } = await supabaseAdmin.from('submissions').select('id,assessment_id,score,created_at').eq('user_id', userId).order('created_at', { ascending: false });
  const assessmentIds = Array.from(new Set((subs||[]).map(s=>s.assessment_id)));
  const { data: assessments } = await supabaseAdmin.from('assessments').select('id,title,type,module_id,total_marks,passing_marks').in('id', assessmentIds);
  const byAssessment: Record<string, any> = {};
  for (const a of (assessments||[])) {
    const aSubs = (subs||[]).filter(s=>s.assessment_id===a.id);
    const attempts = aSubs.length;
    const best = aSubs.reduce((m,s)=> Math.max(m, s.score||0), 0);
    byAssessment[a.id] = {
      id: a.id, title: (a as any).title, type: (a as any).type, total_marks: (a as any).total_marks, passing_marks: (a as any).passing_marks,
      attempts, best_score: best, last_attempt_at: aSubs[0]?.created_at || null,
    };
  }
  res.json({
    user_id: userId,
    courses: (courses||[]).map(c=>({ id: c.id, title: (c as any).title, total_seconds: secondsByCourse[c.id]||0 })),
    assessments: Object.values(byAssessment),
  });
});

// Student-wise assessments CSV
router.get('/student/:userId/assessments.csv', requireRole('admin','super_admin'), async (req, res) => {
  const { userId } = req.params as any;
  const { data: subs } = await supabaseAdmin.from('submissions').select('assessment_id,score,created_at').eq('user_id', userId).order('created_at', { ascending: false });
  const assessmentIds = Array.from(new Set((subs||[]).map(s=>s.assessment_id)));
  const { data: assessments } = await supabaseAdmin.from('assessments').select('id,title,type,total_marks,passing_marks').in('id', assessmentIds);
  const byId = new Map((assessments||[]).map(a=>[a.id, a]));
  const rows = (subs||[]).map(s=>{
    const a = byId.get(s.assessment_id) as any;
    return { title: a?.title || s.assessment_id, type: a?.type || '', score: s.score ?? '', total_marks: a?.total_marks ?? '', created_at: s.created_at };
  });
  const csv = ['Title,Type,Score,TotalMarks,AttemptAt', ...rows.map(r=>`${wrap(r.title)},${wrap(r.type)},${r.score},${r.total_marks},${wrap(r.created_at)}`)].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="student_${userId}_assessments.csv"`);
  res.send(csv);
});

function wrap(x?: string){
  if (!x) return '';
  return '"'+x.replace(/"/g,'""')+'"';
}

// Group consolidated CSV
router.get('/group/:groupId.csv', requireRole('admin','super_admin'), async (req, res) => {
  const { groupId } = req.params as any;
  const { data: members } = await supabaseAdmin.from('group_members').select('user_id').eq('group_id', groupId);
  const userIds = (members||[]).map((m:any)=>m.user_id);
  if (!userIds.length) {
    res.setHeader('Content-Type', 'text/csv');
    res.send('Name,Email,Attempts,LastAttempt');
    return;
  }
  const { data: users } = await supabaseAdmin.from('users').select('id,full_name,email').in('id', userIds);
  const { data: subs } = await supabaseAdmin.from('submissions').select('user_id,created_at').in('user_id', userIds);
  const attemptsByUser: Record<string, number> = {}; const lastByUser: Record<string, string> = {};
  for (const s of (subs||[])) {
    attemptsByUser[s.user_id] = (attemptsByUser[s.user_id]||0)+1;
    const prev = lastByUser[s.user_id]; const cur = s.created_at;
    if (!prev || new Date(cur).getTime() > new Date(prev).getTime()) lastByUser[s.user_id] = cur;
  }
  const rows = (users||[]).map(u => ({ name: u.full_name, email: u.email, attempts: attemptsByUser[u.id]||0, last: lastByUser[u.id]||'' }));
  const csv = ['Name,Email,Attempts,LastAttempt', ...rows.map(r=>`${wrap(r.name)},${wrap(r.email)},${r.attempts},${wrap(r.last)}`)].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="group_${groupId}_report.csv"`);
  res.send(csv);
});

// Assessment CSV: latest score per user
router.get('/assessment/:assessmentId.csv', requireRole('admin','super_admin'), async (req, res) => {
  const { assessmentId } = req.params as any;
  const { data: subs } = await supabaseAdmin
    .from('submissions')
    .select('user_id,score,created_at')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: false });
  const byUser = new Map<string, any>();
  (subs||[]).forEach(s => { if (!byUser.has(s.user_id)) byUser.set(s.user_id, s); });
  const userIds = Array.from(byUser.keys());
  const { data: users } = await supabaseAdmin.from('users').select('id,full_name,email').in('id', userIds);
  const uMap = new Map((users||[]).map(u=>[u.id,u]));
  const rows = userIds.map(uid => ({ name: (uMap.get(uid) as any)?.full_name || uid, email: (uMap.get(uid) as any)?.email || '', score: byUser.get(uid)?.score ?? '', attempted_at: byUser.get(uid)?.created_at || '' }));
  const csv = ['Name,Email,Score,AttemptedAt', ...rows.map(r=>`${wrap(r.name)},${wrap(r.email)},${r.score},${wrap(r.attempted_at)}`)].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="assessment_${assessmentId}.csv"`);
  res.send(csv);
});

export default router;
