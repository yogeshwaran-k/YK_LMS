import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import StudentAssessmentView from './StudentAssessmentView';
import {
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface Course { id: string; title: string }
interface Module { id: string; title: string }
interface Assessment {
  id: string;
  title: string;
  description?: string;
  type: 'mcq' | 'coding' | 'assignment';
  duration_minutes: number;
  total_marks: number;
  allowed_languages?: string[];
  start_at?: string | null;
  end_at?: string | null;
  show_results_immediately?: boolean;
  results_release_at?: string | null;
  results_force_enabled?: boolean;
  is_practice?: boolean;
  // ADDED: Field from Admin side to control results view
  results_show?: 'mark' | 'mark_analysis';
}

export default function StudentAssessments() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, Module[]>>({});
  const [assessmentsByModule, setAssessmentsByModule] = useState<Record<string, Assessment[]>>({});
  const [eligibility, setEligibility] = useState<Record<string, any>>({});
  const [subsByAssessment, setSubsByAssessment] = useState<Record<string, { count: number; latest?: { score: number | null; created_at: string } | null }>>({});
  const [active, setActive] = useState<{ assessment: Assessment; analysis?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showPractice] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const cs = await api.get<Course[]>('/me/courses').catch(() => [] as Course[]);
      setCourses(cs);
      const newModules: Record<string, Module[]> = {};
      const newAssessByMod: Record<string, Assessment[]> = {};
      const newElig: Record<string, any> = {};
      const newSubs: Record<string, any> = {};

      for (const c of cs) {
        const ms = await api.get<Module[]>(`/courses/${c.id}/modules`).catch(() => []);
        newModules[c.id] = ms;
        for (const m of ms) {
          const as = await api.get<Assessment[]>(`/assessments/modules/${m.id}`).catch(() => []);
          newAssessByMod[m.id] = as;
          for (const a of as) {
            try {
              const [e, mine] = await Promise.all([
                api.get<any>(`/assessments/${a.id}/eligibility`).catch(() => null),
                api.get<any>(`/submissions/mine?assessment_id=${a.id}`).catch(() => ({ count: 0, latest: null })),
              ]);
              newElig[a.id] = e;
              newSubs[a.id] = mine;
            } catch {}
          }
        }
      }

      setModulesByCourse(newModules);
      setAssessmentsByModule(newAssessByMod);
      setEligibility(newElig);
      setSubsByAssessment(newSubs);

      // Auto-expand first course
      if (cs.length > 0) {
        setExpandedCourses(new Set([cs[0].id]));
      }
    } catch (err) {
      console.error('Failed to load assessments', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function refreshMeta() {
    for (const mId of Object.keys(assessmentsByModule)) {
      for (const a of assessmentsByModule[mId] || []) {
        try {
          const [e, mine] = await Promise.all([
            api.get<any>(`/assessments/${a.id}/eligibility`).catch(() => null),
            api.get<any>(`/submissions/mine?assessment_id=${a.id}`).catch(() => ({ count: 0, latest: null })),
          ]);
          setEligibility(prev => ({ ...prev, [a.id]: e }));
          setSubsByAssessment(prev => ({ ...prev, [a.id]: mine }));
        } catch {}
      }
    }
  }

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const getAssessmentIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <DocumentTextIcon className="w-4 h-4" />;
      case 'coding': return <CodeBracketIcon className="w-4 h-4" />;
      case 'assignment': return <PencilSquareIcon className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusBadge = (a: Assessment) => {
    const e = eligibility[a.id];
    const now = new Date();
    const startAt = a.start_at ? new Date(a.start_at) : null;
    const endAt = a.end_at ? new Date(a.end_at) : null;

    if (e?.can_resume) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
        <PlayCircleIcon className="w-3 h-3" /> Resume
      </span>;
    }
    if (e?.can_start) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
        <CheckCircleIcon className="w-3 h-3" /> Ready
      </span>;
    }

    const reasons: string[] = e?.reasons || [];
    if (reasons.includes('attempts_exhausted')) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
        <XCircleIcon className="w-3 h-3" /> Attempts Exhausted
      </span>;
    }
    if (reasons.includes('time_frame_expired')) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
        <ClockIcon className="w-3 h-3" /> Expired
      </span>;
    }
    if (startAt && now < startAt) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
        <CalendarIcon className="w-3 h-3" /> Starts at {startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>;
    }
    if (endAt && now > endAt) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
        <XCircleIcon className="w-3 h-3" /> Ended
      </span>;
    }

    return null;
  };

  if (active) {
    return <StudentAssessmentView
      assessment={active.assessment}
      onBack={async () => {
        setActive(null);
        await refreshMeta();
      }}
      analysis={active.analysis}
    />;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assessments</h1>
          <p className="text-sm text-gray-600 mt-1">Track and attempt your course assessments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="border rounded-lg p-4 h-32 bg-gray-50"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <ExclamationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No courses assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {courses.map(course => {
            const courseModules = modulesByCourse[course.id] || [];
            const isExpanded = expandedCourses.has(course.id);

            return (
              <div key={course.id} className="bg-white rounded-lg border shadow-sm">
                {/* Course Header */}
                <button
                  onClick={() => toggleCourse(course.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDownIcon className="w-5 h-5 text-gray-500" /> : <ChevronRightIcon className="w-5 h-5 text-gray-500" />}
                    <h2 className="text-lg font-semibold text-gray-900">{course.title}</h2>
                    <span className="text-sm text-gray-500">({courseModules.length} modules)</span>
                  </div>
                </button>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="border-t">
                    {courseModules.length === 0 ? (
                      <div className="px-5 py-8 text-center text-gray-500">No modules in this course</div>
                    ) : (
                      <div className="divide-y">
                        {courseModules.map(module => {
                          const assessments = (assessmentsByModule[module.id] || [])
                            .filter(a => showPractice || !a.is_practice);
                          const isModExpanded = expandedModules.has(module.id);

                          if (assessments.length === 0) return null;

                          return (
                            <div key={module.id}>
                              <button
                                onClick={() => toggleModule(module.id)}
                                className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {isModExpanded ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                                  <span className="font-medium text-gray-700">{module.title}</span>
                                  <span className="text-xs text-gray-500">({assessments.length} assessments)</span>
                                </div>
                              </button>

                              {isModExpanded && (
                                <div className="p-4 space-y-3 bg-gray-50">
                                  {assessments.map(a => {
                                    const e = eligibility[a.id];
                                    const sub = subsByAssessment[a.id];
                                    
                                    // 1. Check if results are released (Time/Force based) and the student has submitted
                                    const isResultsReleased = (sub?.count || 0) > 0 && (
                                        a.show_results_immediately ||
                                        a.results_force_enabled ||
                                        (a.results_release_at && new Date() >= new Date(a.results_release_at))
                                    );

                                    // 2. Determine if the SCORE should be shown (Admin setting allows marks)
                                    const canViewScore = isResultsReleased && (
                                        a.results_show === 'mark' || 
                                        a.results_show === 'mark_analysis'
                                    );

                                    // 3. Determine if the ANALYSIS button should be shown (Admin setting specifically allows analysis)
                                    const canViewAnalysis = (
                                      a.type !== 'coding' && // Analysis is not typically available for Coding/Assignment until manual grading
                                      isResultsReleased &&
                                      a.results_show === 'mark_analysis' // Admin must explicitly choose 'mark_analysis'
                                    );

                                    return (
                                      <div
                                        key={a.id}
                                        className={`border rounded-lg p-4 bg-white shadow-sm hover:shadow transition-shadow ${
                                          a.is_practice ? 'ring-1 ring-amber-400' : ''
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              {getAssessmentIcon(a.type)}
                                              <h3 className="font-medium text-gray-900 truncate">{a.title}</h3>
                                              {a.is_practice && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Practice</span>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-500 space-y-0.5">
                                              <div>Duration: {a.duration_minutes} min • Marks: {a.total_marks}</div>
                                              {a.description && (
                                                <p className="text-gray-600 line-clamp-2">{a.description}</p>
                                              )}
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                              {getStatusBadge(a)}
                                              {/* Show Score only if canViewScore is true and score is present */}
                                              {canViewScore && sub?.latest?.score != null && (
                                                <span className="text-xs font-medium text-green-700">
                                                  Score: {sub.latest.score} / {a.total_marks}
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex flex-col items-end gap-2">
                                            {(sub?.count ?? 0) > 0 && (
                                              <div className="text-xs text-gray-500">
                                                Attempts: {sub.count}{e?.attempts?.allowed ? `/${e.attempts.allowed}` : ''}
                                              </div>
                                            )}
                                            <div className="flex gap-2">
                                              <button
                                                onClick={() => setActive({ assessment: a })}
                                                disabled={!e?.can_start && !e?.can_resume}
                                                className="px-3 py-1.5 text-xs font-medium rounded border border-indigo-600 text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                                {e?.can_resume ? 'Resume' : 'Start'}
                                              </button>
                                              {/* Show Analysis button only if canViewAnalysis is true */}
                                              {canViewAnalysis && (
                                                <button
                                                  onClick={() => setActive({ assessment: a, analysis: true })}
                                                  className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                >
                                                  Analysis
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}