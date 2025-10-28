import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';

const router = Router();
router.use(authenticate);

router.post('/:assessmentId/mcq-questions/bulk', requireRole('admin','super_admin'), async (req, res) => {
  const { assessmentId } = req.params;
  const csv: string = (req.body?.csv as string) || '';
  if (!csv.trim()) return res.status(400).json({ error: 'Missing csv' });
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) return res.status(400).json({ error: 'Empty csv' });
  const headers = header.split(',').map(h=>h.trim().toLowerCase());
  const required = ['question_text','option_a','option_b','option_c','option_d','correct_option','marks'];
  for (const r of required) if (!headers.includes(r)) return res.status(400).json({ error: `Missing column ${r}` });
  const rows = lines.map(line => {
    const cols = line.split(',');
    const get = (name: string) => cols[headers.indexOf(name)]?.trim();
    return {
      assessment_id: assessmentId,
      question_text: get('question_text'),
      option_a: get('option_a'),
      option_b: get('option_b'),
      option_c: get('option_c'),
      option_d: get('option_d'),
      correct_option: get('correct_option') as 'a'|'b'|'c'|'d',
      marks: Number(get('marks')||0) || 1,
      difficulty: (get('difficulty') || null) as any,
      topic: (get('topic') || null),
      explanation: get('explanation') || '',
    };
  });
  const { error } = await supabaseAdmin.from('mcq_questions').insert(rows);
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ inserted: rows.length });
});

export default router;