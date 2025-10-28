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

function wrap(x?: string){
  if (!x) return '';
  return '"'+x.replace(/"/g,'""')+'"';
}

export default router;