import { supabaseAdmin } from '../supabase';

export interface EffectiveAssessmentSettings {
  allowed_attempts: number;
  resume_limit: number;
  start_at: string | null;
  end_at: string | null;
  duration_minutes: number | null;
  allowed_languages?: string[] | null;
}

export async function getEffectiveAssessmentSettings(assessmentId: string, userId: string): Promise<EffectiveAssessmentSettings | null> {
  const { data: a, error: e1 } = await supabaseAdmin
    .from('assessments')
    .select('*')
    .eq('id', assessmentId)
    .maybeSingle();
  if (e1 || !a) return null;
  const base = a as any;
  const { data: o } = await supabaseAdmin
    .from('assessment_user_settings')
    .select('max_attempts,resume_limit,start_at,end_at,allowed_languages')
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId)
    .maybeSingle();
  const eff: EffectiveAssessmentSettings = {
    allowed_attempts: o?.max_attempts ?? base.allowed_attempts ?? 1,
    resume_limit: o?.resume_limit ?? base.resume_limit ?? 0,
    start_at: (o?.start_at as any) ?? (base.start_at as any) ?? null,
    end_at: (o?.end_at as any) ?? (base.end_at as any) ?? null,
    duration_minutes: base.duration_minutes ?? null,
    allowed_languages: (o?.allowed_languages as any) ?? (base.allowed_languages as any) ?? null,
  };
  return eff;
}

export async function getUserAttemptCount(assessmentId: string, userId: string): Promise<number> {
  const { count, error } = await (supabaseAdmin
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId) as any);
  if (error) return 0;
  return (count as number) ?? 0;
}

export async function getActiveSession(assessmentId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from('assessment_sessions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as any | null;
}

export function withinWindow(now: Date, start_at: string | null, end_at: string | null) {
  if (start_at && now < new Date(start_at)) return false;
  if (end_at && now > new Date(end_at)) return false;
  return true;
}

export function remainingSeconds(now: Date, started_at: string, duration_minutes: number | null, end_at: string | null) {
  let until = Infinity;
  if (duration_minutes && duration_minutes > 0) {
    const deadline = new Date(started_at);
    deadline.setMinutes(deadline.getMinutes() + duration_minutes);
    until = Math.min(until, (deadline.getTime() - now.getTime()) / 1000);
  }
  if (end_at) {
    const end = new Date(end_at);
    until = Math.min(until, (end.getTime() - now.getTime()) / 1000);
  }
  return Math.max(0, Math.floor(isFinite(until) ? until : 0));
}