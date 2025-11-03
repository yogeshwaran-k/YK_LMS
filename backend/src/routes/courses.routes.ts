import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import { ensureCourseAccessOr403, getAssignedCourseIds } from '../utils/access';

const router = Router();

router.use(authenticate);

// Courses
router.get('/', async (req, res) => {
  const role = req.user?.role;
  if (role === 'admin' || role === 'super_admin') {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  // Student: only assigned courses (direct or via groups)
  const ids = await getAssignedCourseIds(req.user!.sub);
  if (!ids.length) return res.json([]);
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', requireRole('admin', 'super_admin'), async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional().default(''),
    category: z.enum([
      'labs',
      'semester_exams',
      'aptitude',
      'communication',
      'coding',
      'placement',
      'general',
    ]).optional(),
    is_published: z.boolean().optional().default(false),
    enable_certificates: z.boolean().optional().default(false),
    enable_gamification: z.boolean().optional().default(false),
    push_on_assign: z.boolean().optional().default(false),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const payload = { ...parsed.data };
  let { data, error } = await supabaseAdmin
    .from('courses')
    .insert([payload])
    .select()
    .maybeSingle();
  if (error && /column .* does not exist/i.test(error.message)) {
    // Fallback to minimal shape for older schemas
    const minimal = {
      title: payload.title,
      description: payload.description ?? '',
      category: payload.category ?? 'general',
    } as any;
    const retry = await supabaseAdmin
      .from('courses')
      .insert([minimal])
      .select()
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }
  if (error) return res.status(500).json({ error: error.message });
  // Broadcast to all active students if requested and published
  if ((payload as any).push_on_assign && (payload as any).is_published) {
    const { data: students } = await supabaseAdmin.from('users').select('id').eq('role','student').eq('is_active', true);
    const userIds = (students||[]).map((u:any)=>u.id);
    if (userIds.length) {
      const title = 'New Course Published';
      const body = `A new course is available: ${(data as any)?.title || payload.title}`;
      await supabaseAdmin.from('notifications').insert(userIds.map(uid=>({ user_id: uid, title, body })));
      const { pushNew, pushUnread } = await import('../events/notify');
      for (const uid of userIds) { pushNew(uid, { title, body }); void pushUnread(uid); }
    }
  }
  res.status(201).json(data);
});

router.put('/:courseId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { courseId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('courses')
    .update(req.body)
    .eq('id', courseId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  // If toggled to published and push flag set, notify all active students
  if ((req.body?.push_on_assign || (data as any)?.push_on_assign) && (req.body?.is_published || (data as any)?.is_published)) {
    const { data: students } = await supabaseAdmin.from('users').select('id').eq('role','student').eq('is_active', true);
    const userIds = (students||[]).map((u:any)=>u.id);
    if (userIds.length) {
      const title = 'Course Published';
      const body = `Course updated/published: ${(data as any)?.title || ''}`;
      await supabaseAdmin.from('notifications').insert(userIds.map(uid=>({ user_id: uid, title, body })));
      const { pushNew, pushUnread } = await import('../events/notify');
      for (const uid of userIds) { pushNew(uid, { title, body }); void pushUnread(uid); }
    }
  }
  res.json(data);
});

router.delete('/:courseId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { courseId } = req.params;
  const { error } = await supabaseAdmin
    .from('courses')
    .delete()
    .eq('id', courseId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// Modules (nested under course)
router.get('/:courseId/modules', async (req, res) => {
  const { courseId } = req.params;
  // Enforce student visibility
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const { data, error } = await supabaseAdmin
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:courseId/modules', requireRole('admin', 'super_admin'), async (req, res) => {
  const { courseId } = req.params;
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional().default(''),
    order_index: z.number().int().nonnegative().optional().default(0),
    min_time_minutes: z.number().int().nonnegative().optional().default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('modules')
    .insert([{ ...parsed.data, course_id: courseId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:courseId/modules/:moduleId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { moduleId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('modules')
    .update(req.body)
    .eq('id', moduleId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:courseId/modules/:moduleId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { moduleId } = req.params;
  const { error } = await supabaseAdmin
    .from('modules')
    .delete()
    .eq('id', moduleId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// Lessons (nested under module)
router.get('/:courseId/modules/:moduleId/lessons', async (req, res) => {
  const { courseId, moduleId } = req.params as any;
  // Enforce student visibility
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const { data, error } = await supabaseAdmin
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('order_index', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:courseId/modules/:moduleId/lessons', requireRole('admin', 'super_admin'), async (req, res) => {
  const { moduleId } = req.params;
  const schema = z.object({
    title: z.string().min(1),
    content_type: z.enum(['text', 'video', 'pdf', 'ppt', 'coding']),
    content_url: z.string().optional(),
    content_text: z.string().optional(),
    order_index: z.number().int().nonnegative().optional().default(0),
    min_time_minutes: z.number().int().nonnegative().optional().default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('lessons')
    .insert([{ ...parsed.data, module_id: moduleId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/:courseId/modules/:moduleId/lessons/:lessonId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { lessonId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('lessons')
    .update(req.body)
    .eq('id', lessonId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:courseId/modules/:moduleId/lessons/:lessonId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { lessonId } = req.params;
  const { error } = await supabaseAdmin
    .from('lessons')
    .delete()
    .eq('id', lessonId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

export default router;
