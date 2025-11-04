import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { supabaseAdmin } from '../supabase';
import { z } from 'zod';
import { ensureCourseAccessOr403, resolveCourseIdForAssessment, resolveCourseIdForModule } from '../utils/access';

const router = Router();
router.use(authenticate);

// Coding questions
router.get('/:assessmentId/coding-questions', async (req, res) => {
  const { assessmentId } = req.params;
  // Enforce student visibility
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const { data, error } = await supabaseAdmin
    .from('coding_questions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/:assessmentId/coding-questions', requireRole('admin', 'super_admin'), async (req, res) => {
  const { assessmentId } = req.params;
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    marks: z.number().int().optional().default(10),
    time_limit_seconds: z.number().int().optional().default(5),
    memory_limit_mb: z.number().int().optional().default(256),
    starter_code: z.string().optional().default(''),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('coding_questions')
    .insert([{ ...parsed.data, assessment_id: assessmentId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/coding-questions/:questionId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { questionId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('coding_questions')
    .update(req.body)
    .eq('id', questionId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/coding-questions/:questionId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { questionId } = req.params;
  const { error } = await supabaseAdmin
    .from('coding_questions')
    .delete()
    .eq('id', questionId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// Test cases
router.get('/coding-questions/:questionId/test-cases', async (req, res) => {
  const { questionId } = req.params;
  // Resolve assessment from coding question
  const { data: cq, error: e1 } = await supabaseAdmin
    .from('coding_questions')
    .select('assessment_id')
    .eq('id', questionId)
    .maybeSingle();
  if (e1 || !cq) return res.status(404).json({ error: 'Question not found' });
  const courseId = await resolveCourseIdForAssessment((cq as any).assessment_id);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;
  const role = req.user?.role;
  let q = supabaseAdmin
    .from('test_cases')
    .select('*')
    .eq('coding_question_id', questionId)
    .order('created_at', { ascending: true });
  if (role === 'student') {
    q = q.eq('is_hidden', false);
  }
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/coding-questions/:questionId/test-cases', requireRole('admin', 'super_admin'), async (req, res) => {
  const { questionId } = req.params;
  const schema = z.object({
    input: z.string(),
    expected_output: z.string(),
    is_hidden: z.boolean().optional().default(false),
    weightage: z.number().int().optional().default(10),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid body' });
  const { data, error } = await supabaseAdmin
    .from('test_cases')
    .insert([{ ...parsed.data, coding_question_id: questionId }])
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.put('/test-cases/:testCaseId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { testCaseId } = req.params;
  const { data, error } = await supabaseAdmin
    .from('test_cases')
    .update(req.body)
    .eq('id', testCaseId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/test-cases/:testCaseId', requireRole('admin', 'super_admin'), async (req, res) => {
  const { testCaseId } = req.params;
  const { error } = await supabaseAdmin
    .from('test_cases')
    .delete()
    .eq('id', testCaseId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// Evaluate code against all test cases (samples + hidden) for a coding question
router.post('/coding-questions/:questionId/evaluate', async (req, res) => {
  const { questionId } = req.params as any;
  const { code, language } = req.body || {};
  if (!code || !language) return res.status(400).json({ error: 'code and language required' });
  // Resolve assessment and enforce access
  const { data: cq } = await supabaseAdmin
    .from('coding_questions')
    .select('assessment_id')
    .eq('id', questionId)
    .maybeSingle();
  if (!cq) return res.status(404).json({ error: 'Question not found' });
  const assessmentId = (cq as any).assessment_id;
  const courseId = await resolveCourseIdForAssessment(assessmentId);
  if (!courseId) return res.status(404).json({ error: 'Assessment not found' });
  const ok = await ensureCourseAccessOr403(req, res, courseId);
  if (!ok) return;

  // Language restriction
  const { getEffectiveAssessmentSettings } = await import('../utils/assessments');
  const settings = await getEffectiveAssessmentSettings(assessmentId, req.user!.sub);
  const allowed = (settings?.allowed_languages as any) as string[] | null | undefined;
  const normalizeLanguage = (lang: string) => {
    const l = String(lang||'').toLowerCase();
    const map: Record<string, string> = { js: 'javascript', node: 'javascript', ts: 'typescript', py: 'python', python3: 'python', cplusplus: 'cpp' };
    return map[l] ?? l;
  };
  const langNorm = normalizeLanguage(language);
  if (allowed && allowed.length && !allowed.includes(langNorm)) return res.status(403).json({ error: 'Language not allowed' });

  const { data: testCases, error: tcErr } = await supabaseAdmin
    .from('test_cases')
    .select('id,input,expected_output,is_hidden,weightage')
    .eq('coding_question_id', questionId)
    .order('created_at', { ascending: true });
  if (tcErr) return res.status(500).json({ error: tcErr.message });

  async function runOne(stdin: string): Promise<{ stdout: string; stderr: string }> {
    // Use configured runner provider directly
    const { env } = await import('../env');
    if (env.runnerProvider === 'piston') {
      const resp = await fetch(`${env.pistonBaseUrl}/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: langNorm, version: '*', files: [{ name: 'Main', content: code }], stdin })
      });
      if (!resp.ok) { const txt = await resp.text(); throw new Error(`Runner error: ${txt}`); }
      const data = await resp.json() as any;
      return { stdout: data.run?.stdout ?? '', stderr: data.run?.stderr ?? '' };
    }
    // judge0
    const { env: env2 } = await import('../env');
    if (!env2.judge0BaseUrl) throw new Error('Judge0 not configured');
    const judge0LanguageIds: Record<string, number> = { c: 50, cpp: 54, java: 91, python: 71, javascript: 63, typescript: 74 };
    const language_id = judge0LanguageIds[langNorm];
    if (!language_id) throw new Error(`Unsupported language: ${language}`);
    const resp = await fetch(`${env2.judge0BaseUrl}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(env2.judge0ApiKey ? { 'X-Auth-Token': env2.judge0ApiKey } : {}) } as any,
      body: JSON.stringify({ source_code: code, language_id, stdin })
    });
    if (!resp.ok) { const txt = await resp.text(); throw new Error(`Runner error: ${txt}`); }
    const data = await resp.json() as any;
    return { stdout: data.stdout ?? '', stderr: data.stderr ?? '' };
  }

  const rows: any[] = [];
  let passed = 0;
  for (let i = 0; i < (testCases||[]).length; i++) {
    const t = (testCases as any[])[i];
    const resOne = await runOne(t.input);
    const out = String(resOne.stdout || '').trim();
    const exp = String(t.expected_output || '').trim();
    const okRow = out === exp;
    if (okRow) passed++;
    rows.push({ idx: i+1, status: okRow ? 'Pass' : 'Fail', expected: t.is_hidden ? undefined : exp, actual: t.is_hidden ? undefined : out, kind: t.is_hidden ? 'hidden' : 'sample', test_case_id: t.id, weightage: t.weightage });
  }
  res.json({ passed, total: (testCases||[]).length, rows });
});

router.post('/:assessmentId/coding-questions/bulk', requireRole('admin','super_admin'), async (req, res) => {
  const { assessmentId } = req.params;
  const csv: string = (req.body?.csv as string) || '';
  if (!csv.trim()) return res.status(400).json({ error: 'Missing csv' });
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines.shift();
  if (!header) return res.status(400).json({ error: 'Empty csv' });
  const headers = header.split(',').map(h=>h.trim().toLowerCase());
  const required = ['title','description'];
  for (const r of required) if (!headers.includes(r)) return res.status(400).json({ error: `Missing column ${r}` });
  const rows = lines.map(line => {
    const cols = line.split(',');
    const get = (name: string) => cols[headers.indexOf(name)]?.trim();
    return {
      assessment_id: assessmentId,
      title: get('title'),
      description: get('description'),
      difficulty: (get('difficulty') || null),
      marks: Number(get('marks')||10) || 10,
      time_limit_seconds: Number(get('time_limit_seconds')||5) || 5,
      memory_limit_mb: Number(get('memory_limit_mb')||256) || 256,
      starter_code: get('starter_code') || '',
    };
  });
  const { error } = await supabaseAdmin.from('coding_questions').insert(rows);
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ inserted: rows.length });
});

export default router;
