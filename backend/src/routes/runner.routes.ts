import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import { env } from '../env';

const router = Router();
router.use(authenticate);

const bodySchema = z.object({
  language: z.string().min(1),
  code: z.string().min(1),
  stdin: z.string().optional().default(''),
});

// Map common language aliases to Piston names
const normalizeLanguage = (lang: string) => {
  const l = lang.toLowerCase();
  const map: Record<string, string> = {
    js: 'javascript',
    node: 'javascript',
    ts: 'typescript',
    py: 'python',
    python3: 'python',
    cplusplus: 'cpp',
  };
  return map[l] ?? l;
};

router.post('/execute', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
  const { language, code, stdin } = parsed.data;

  try {
    if (env.runnerProvider === 'piston') {
      const lang = normalizeLanguage(language);
      const resp = await fetch(`${env.pistonBaseUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: lang,
          version: '*',
          files: [{ name: 'Main', content: code }],
          stdin,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        return res.status(500).json({ error: `Runner error: ${txt}` });
      }
      const data = await resp.json() as any;
      return res.json({
        stdout: data.run?.stdout ?? '',
        stderr: data.run?.stderr ?? '',
        exitCode: data.run?.code ?? null,
        signal: data.run?.signal ?? null,
        time: data.run?.time ?? null,
        memory: data.run?.memory ?? null,
      });
    }

    // judge0 branch
    if (!env.judge0BaseUrl) return res.status(500).json({ error: 'Judge0 not configured' });
    // Minimal language map for Judge0 (extend as needed)
    const judge0LanguageIds: Record<string, number> = {
      'c': 50,
      'cpp': 54,
      'java': 91,
      'python': 71,
      'javascript': 63,
      'typescript': 74,
    };
    const langNorm = normalizeLanguage(language);
    const language_id = judge0LanguageIds[langNorm];
    if (!language_id) return res.status(400).json({ error: `Unsupported language: ${language}` });

    const resp = await fetch(`${env.judge0BaseUrl}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.judge0ApiKey ? { 'X-Auth-Token': env.judge0ApiKey } : {}),
      } as any,
      body: JSON.stringify({ source_code: code, language_id, stdin }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(500).json({ error: `Runner error: ${txt}` });
    }
    const data = await resp.json() as any;
    return res.json({
      stdout: data.stdout ?? '',
      stderr: data.stderr ?? '',
      exitCode: data.status?.id ?? null,
      status: data.status?.description ?? null,
      time: data.time ?? null,
      memory: data.memory ?? null,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Runner failed' });
  }
});

export default router;