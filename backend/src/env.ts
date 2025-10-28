import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const schema = z.object({
  PORT: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  JWT_SECRET: z.string().min(16),
  NODE_ENV: z.string().optional(),
  RUNNER_PROVIDER: z.enum(['piston', 'judge0']).optional(),
  PISTON_BASE_URL: z.string().url().optional(),
  JUDGE0_BASE_URL: z.string().url().optional(),
  JUDGE0_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  port: Number(parsed.data.PORT ?? 4000),
  supabaseUrl: parsed.data.SUPABASE_URL,
  supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
  supabaseServiceKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  jwtSecret: parsed.data.JWT_SECRET,
  nodeEnv: parsed.data.NODE_ENV ?? 'development',
  runnerProvider: (parsed.data.RUNNER_PROVIDER ?? 'piston') as 'piston' | 'judge0',
  pistonBaseUrl: parsed.data.PISTON_BASE_URL ?? 'https://emkc.org/api/v2/piston',
  judge0BaseUrl: parsed.data.JUDGE0_BASE_URL,
  judge0ApiKey: parsed.data.JUDGE0_API_KEY,
};
