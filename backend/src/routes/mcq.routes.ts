import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import { ensureCourseAccessOr403, resolveCourseIdForAssessment } from '../utils/access';

const router = Router();
router.use(authenticate);

// --- GET Questions ---
router.get('/:assessmentId/mcq-questions', async (req, res) => {
  const { assessmentId } = req.params;
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const role = req.user?.role;
  let q = supabaseAdmin
    .from('mcq_questions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: true });
  if (role === 'student') {
    // Student logic...
  }
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- POST Create Question ---
router.post('/:assessmentId/mcq-questions', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assessmentId } = req.params;
  const schema = z.object({
    question_text: z.string().min(1),
    option_a: z.string(),
    option_b: z.string(),
    option_c: z.string(),
    option_d: z.string(),
    correct_option: z.enum(['a', 'b', 'c', 'd']),
    marks: z.number().int().optional().default(1),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    topic: z.string().optional(),
    explanation: z.string().optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('mcq_questions')
    .insert([{ ...parsed.data, assessment_id: assessmentId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// --- PUT Update Question ---
router.put('/mcq-questions/:questionId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { questionId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('mcq_questions')
    .update(req.body)
    .eq('id', questionId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- DELETE Single Question ---
router.delete('/mcq-questions/:questionId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { questionId } = req.params;
  const { error } = await supabaseAdmin
    .from('mcq_questions')
    .delete()
    .eq('id', questionId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// --- POST Bulk Delete Questions ---
router.post('/mcq-questions/bulk-delete', requireRole('admin', 'super_admin'), async (req, res) => {
  const schema = z.object({
    ids: z.array(z.string().uuid()).min(1),
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body format. Expected { ids: string[] }.' });
  }

  const { ids } = parsed.data;

  try {
    const { error } = await supabaseAdmin
      .from('mcq_questions')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Supabase bulk delete error:', error);
      return res.status(500).json({ error: 'Failed to delete questions in bulk.' });
    }

    res.status(204).end(); // Success
  } catch (e) {
    console.error('Server error during bulk delete:', e);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});


// 🚀 --- POST Bulk Clone Questions (NEW ROUTE) ---
router.post('/:assessmentId/mcq-questions/bulk-clone', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assessmentId } = req.params;

  const schema = z.object({
    ids: z.array(z.string().uuid()).min(1),
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body format. Expected { ids: string[] }.' });
  }

  const { ids } = parsed.data;

  try {
    // 1. Fetch the existing questions to be cloned
    const { data: originalQuestions, error: fetchError } = await supabaseAdmin
      .from('mcq_questions')
      .select('question_text, option_a, option_b, option_c, option_d, correct_option, marks, difficulty, topic, explanation')
      .in('id', ids);

    if (fetchError) {
      console.error('Supabase bulk clone fetch error:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch original questions.' });
    }

    if (!originalQuestions || originalQuestions.length === 0) {
      return res.status(404).json({ error: 'No questions found to clone.' });
    }

    // 2. Prepare the new question objects for insertion
    const newQuestions = originalQuestions.map(q => ({
      ...q,
      assessment_id: assessmentId, // Assign the new copies to the current assessment
    }));

    // 3. Insert the new cloned questions
    const { data: newClones, error: insertError } = await supabaseAdmin
      .from('mcq_questions')
      .insert(newQuestions)
      .select();

    if (insertError) {
      console.error('Supabase bulk clone insert error:', insertError);
      return res.status(500).json({ error: 'Failed to insert cloned questions.' });
    }

    // 4. Success response
    res.status(201).json(newClones);
  } catch (e) {
    console.error('Server error during bulk clone:', e);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});


export default router;