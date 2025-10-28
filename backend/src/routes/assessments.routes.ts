import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import { resolveCourseIdForModule, ensureCourseAccessOr403 } from '../utils/access';

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
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const payload = { ...parsed.data, deadline: parsed.data.deadline ?? null, start_at: parsed.data.start_at ?? null, end_at: parsed.data.end_at ?? null } as any;
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

export default router;
