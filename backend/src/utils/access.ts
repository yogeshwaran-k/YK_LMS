import { supabaseAdmin } from '../supabase';
import { Request, Response } from 'express';

export async function getAssignedCourseIds(userId: string): Promise<string[]> {
  const ids = new Set<string>();

  // Direct assignments
  const { data: direct, error: e1 } = await supabaseAdmin
    .from('course_assignments')
    .select('course_id')
    .eq('user_id', userId);
  if (!e1 && direct) direct.forEach((r: any) => ids.add(r.course_id));

  // Groups for user
  const { data: groups, error: e2 } = await supabaseAdmin
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);
  if (!e2 && groups && groups.length) {
    const groupIds = groups.map((g: any) => g.group_id);
    const { data: groupCourses } = await supabaseAdmin
      .from('course_group_assignments')
      .select('course_id')
      .in('group_id', groupIds);
    if (groupCourses) groupCourses.forEach((r: any) => ids.add(r.course_id));
  }

  return Array.from(ids);
}

export async function ensureCourseAccessOr403(req: Request, res: Response, courseId: string): Promise<boolean> {
  const role = req.user?.role;
  if (role === 'admin' || role === 'super_admin') return true;
  if (role !== 'student') return false;
  const allowed = await getAssignedCourseIds(req.user!.sub);
  if (!allowed.includes(courseId)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

export async function resolveCourseIdForModule(moduleId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('modules')
    .select('course_id')
    .eq('id', moduleId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as any).course_id as string;
}

export async function resolveCourseIdForAssessment(assessmentId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select('module_id')
    .eq('id', assessmentId)
    .maybeSingle();
  if (error || !data) return null;
  const moduleId = (data as any).module_id as string;
  const courseId = await resolveCourseIdForModule(moduleId);
  return courseId;
}

export async function resolveCourseIdForLesson(lessonId: string): Promise<string | null> {
  const { data: lesson, error: e1 } = await supabaseAdmin
    .from('lessons')
    .select('module_id')
    .eq('id', lessonId)
    .maybeSingle();
  if (e1 || !lesson) return null;
  const moduleId = (lesson as any).module_id as string;
  return resolveCourseIdForModule(moduleId);
}
