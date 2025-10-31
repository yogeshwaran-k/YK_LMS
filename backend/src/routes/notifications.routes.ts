import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const role = req.user?.role;
  const qUser = (req.query.user_id as string | undefined) || undefined;
  const targetUserId = (role === 'admin' || role === 'super_admin') && qUser ? qUser : req.user!.sub;
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/', requireRole('admin','super_admin'), async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    user_id: z.string().uuid().optional(),
    course_id: z.string().uuid().optional(),
    assessment_id: z.string().uuid().optional(),
    group_id: z.string().uuid().optional(),
  }).refine(v => v.user_id || v.course_id || v.assessment_id || v.group_id, { message: 'Specify a target: user_id | course_id | assessment_id | group_id' });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });

  const { title, body, user_id, course_id, assessment_id, group_id } = parsed.data as any;
  let userIds: string[] = [];
  if (user_id) userIds.push(user_id);
  if (group_id) {
    const { data: members } = await supabaseAdmin.from('group_members').select('user_id').eq('group_id', group_id);
    userIds.push(...(members||[]).map((m:any)=>m.user_id));
  }
  async function addCourseUsers(cid: string) {
    const { data: assigns } = await supabaseAdmin.from('course_assignments').select('user_id').eq('course_id', cid);
    userIds.push(...(assigns||[]).map((a:any)=>a.user_id));
    const { data: groups } = await supabaseAdmin.from('course_group_assignments').select('group_id').eq('course_id', cid);
    const gIds = (groups||[]).map((g:any)=>g.group_id);
    if (gIds.length) {
      const { data: members } = await supabaseAdmin.from('group_members').select('user_id').in('group_id', gIds);
      userIds.push(...(members||[]).map((m:any)=>m.user_id));
    }
  }
  if (course_id) await addCourseUsers(course_id);
  if (assessment_id) {
    const { data: a } = await supabaseAdmin.from('assessments').select('module_id').eq('id', assessment_id).maybeSingle();
    if (a) {
      const { data: mod } = await supabaseAdmin.from('modules').select('course_id').eq('id', (a as any).module_id).maybeSingle();
      if (mod) await addCourseUsers((mod as any).course_id);
    }
  }
  userIds = Array.from(new Set(userIds));
  if (!userIds.length) return res.status(400).json({ error: 'No recipients found' });

  try {
    const rows = userIds.map(uid => ({ user_id: uid, title, body }));
    const { error } = await supabaseAdmin.from('notifications').insert(rows);
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ sent: rows.length });
  } catch (e:any) {
    res.status(400).json({ error: e?.message || 'Failed to create notifications' });
  }
});

export default router;