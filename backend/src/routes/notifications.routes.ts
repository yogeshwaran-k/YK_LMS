import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { registerClient, pushUnread, pushNew } from '../events/notify';

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

// Unread count for current user
router.get('/unread-count', async (req, res) => {
  const userId = req.user!.sub;
  const { count } = await (supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }) as any)
    .eq('user_id', userId)
    .is('read_at', null);
  res.json({ count: (count as number) || 0 });
});

// Mark as read (owner or admin)
router.patch('/:id/read', async (req, res) => {
  const { id } = req.params;
  const role = req.user?.role;
  const userId = req.user!.sub;
  let q = supabaseAdmin.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).select('user_id').maybeSingle();
  if (!(role==='admin' || role==='super_admin')) {
    q = (supabaseAdmin.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId).select('user_id').maybeSingle()) as any;
  }
  const { data, error } = await q as any;
  if (error) return res.status(500).json({ error: error.message });
  const target = (data as any)?.user_id || userId;
  void pushUnread(target);
  res.json({ ok: true });
});

// Delete (owner or admin)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const role = req.user?.role;
  const userId = req.user!.sub;
  let q = supabaseAdmin.from('notifications').delete().eq('id', id).select('user_id').maybeSingle();
  if (!(role==='admin' || role==='super_admin')) q = (supabaseAdmin.from('notifications').delete().eq('id', id).eq('user_id', userId).select('user_id').maybeSingle()) as any;
  const { data, error } = await q as any;
  if (error) return res.status(500).json({ error: error.message });
  const target = (data as any)?.user_id || userId;
  void pushUnread(target);
  res.status(204).end();
});

// SSE stream (supports token via query param because EventSource cannot set headers)
router.get('/stream', async (req, res) => {
  let userId: string | null = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try { userId = (jwt.verify(auth.slice(7), env.jwtSecret) as any).sub; } catch {}
  }
  if (!userId) {
    const token = (req.query.token as string | undefined) || '';
    try { userId = (jwt.verify(token, env.jwtSecret) as any).sub; } catch {}
  }
  if (!userId) return res.status(401).end();
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: ready\ndata: {}\n\n`);
  registerClient(userId, res);
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
    // push SSE events
    for (const uid of userIds) { pushNew(uid, { title, body }); void pushUnread(uid); }
    res.status(201).json({ sent: rows.length });
  } catch (e:any) {
    res.status(400).json({ error: e?.message || 'Failed to create notifications' });
  }
});

export default router;