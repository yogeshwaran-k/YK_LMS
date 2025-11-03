import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

router.post('/courses/:courseId/assign', requireRole('admin', 'super_admin'), async (req, res) => {
  const { courseId } = req.params;
  const schema = z.object({ user_ids: z.array(z.string().uuid()).min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const rows = parsed.data.user_ids.map((uid) => ({ course_id: courseId, user_id: uid }));
  const { error } = await supabaseAdmin.from('course_assignments').upsert(rows, { onConflict: 'course_id,user_id' });
  if (error) return res.status(500).json({ error: error.message });
  // Push notifications if enabled on course
  const { data: course } = await supabaseAdmin.from('courses').select('title,push_on_assign').eq('id', courseId).maybeSingle();
  if ((course as any)?.push_on_assign) {
    const title = 'Course Assigned';
    const body = `You have been assigned to course: ${(course as any).title}`;
    const notifs = parsed.data.user_ids.map(uid => ({ user_id: uid, title, body }));
    await supabaseAdmin.from('notifications').insert(notifs);
    const { pushNew, pushUnread } = await import('../events/notify');
    for (const uid of parsed.data.user_ids) { pushNew(uid, { title, body }); void pushUnread(uid); }
  }
  res.status(204).end();
});

router.post('/courses/:courseId/assign-groups', requireRole('admin', 'super_admin'), async (req, res) => {
  const { courseId } = req.params;
  const schema = z.object({ group_ids: z.array(z.string().uuid()).min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const rows = parsed.data.group_ids.map((gid) => ({ course_id: courseId, group_id: gid }));
  const { error } = await supabaseAdmin.from('course_group_assignments').upsert(rows, { onConflict: 'course_id,group_id' });
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

router.get('/me/courses', async (req, res) => {
  const userId = req.user!.sub;
  const assigned = (await supabaseAdmin.from('course_assignments').select('course_id').eq('user_id', userId));
  if (assigned.error) return res.status(500).json({ error: assigned.error.message });
  const userCourseIds = assigned.data?.map(r => r.course_id) || [];

  // group-based
  const { data: myGroups, error: gErr } = await supabaseAdmin.from('group_members').select('group_id').eq('user_id', userId);
  if (gErr) return res.status(500).json({ error: gErr.message });
  const gIds = myGroups?.map(g=>g.group_id) || [];
  let groupCourseIds: string[] = [];
  if (gIds.length) {
    const { data: cg, error: cgErr } = await supabaseAdmin.from('course_group_assignments').select('course_id').in('group_id', gIds);
    if (cgErr) return res.status(500).json({ error: cgErr.message });
    groupCourseIds = cg?.map(r=>r.course_id) || [];
  }
  const ids = Array.from(new Set([...userCourseIds, ...groupCourseIds]));
  if (ids.length === 0) return res.json([]);
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('*')
    .in('id', ids)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

export default router;