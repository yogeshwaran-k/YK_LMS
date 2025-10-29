import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import StudentAssessmentView from './StudentAssessmentView';

interface Course { id: string; title: string }
interface Module { id: string; title: string }
interface Assessment { id: string; title: string; description?: string; type: 'mcq'|'coding'|'assignment'; duration_minutes: number; total_marks: number; allowed_languages?: string[]; start_at?: string|null; end_at?: string|null; show_results_immediately?: boolean; results_release_at?: string|null; results_force_enabled?: boolean }

export default function StudentAssessments() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, Module[]>>({});
  const [assessmentsByModule, setAssessmentsByModule] = useState<Record<string, Assessment[]>>({});
  const [eligibility, setEligibility] = useState<Record<string, any>>({});
  const [subsByAssessment, setSubsByAssessment] = useState<Record<string, { count: number; latest?: { score: number|null; created_at: string } | null }>>({});
  const [active, setActive] = useState<{ assessment: Assessment; analysis?: boolean }|null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAll(){
    setLoading(true);
    try {
      const cs = await api.get<Course[]>('/me/courses').catch(()=>[] as Course[]);
      setCourses(cs);
      const newModules: Record<string, Module[]> = {};
      const newAssessByMod: Record<string, Assessment[]> = {};
      const newElig: Record<string, any> = {};
      const newSubs: Record<string, { count: number; latest?: { score: number|null; created_at: string } | null }> = {} as any;
      for (const c of cs) {
        const ms = await api.get<Module[]>(`/courses/${c.id}/modules`);
        newModules[c.id] = ms;
        for (const m of ms) {
          const as = await api.get<Assessment[]>(`/assessments/modules/${m.id}`);
          newAssessByMod[m.id] = as;
          for (const a of as) {
            try {
              const [e, mine] = await Promise.all([
                api.get<any>(`/assessments/${a.id}/eligibility`).catch(()=>null),
                api.get<{ count: number; latest?: { score: number|null; created_at: string } | null }>(`/submissions/mine?assessment_id=${a.id}`).catch(()=>({ count: 0, latest: null } as any)),
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
    } finally { setLoading(false); }
  }

  useEffect(()=>{ loadAll(); }, []);

  async function refreshMeta() {
    try {
      const mods = Object.keys(assessmentsByModule);
      for (const mId of mods) {
        const as = assessmentsByModule[mId] || [];
        for (const a of as) {
          try {
            const [e, mine] = await Promise.all([
              api.get<any>(`/assessments/${a.id}/eligibility`).catch(()=>null),
              api.get<{ count: number; latest?: { score: number|null; created_at: string } | null }>(`/submissions/mine?assessment_id=${a.id}`).catch(()=>({ count: 0, latest: null } as any)),
            ]);
            setEligibility(prev=>({ ...prev, [a.id]: e }));
            setSubsByAssessment(prev=>({ ...prev, [a.id]: mine }));
          } catch {}
        }
      }
    } catch {}
  }

  if (active) return <StudentAssessmentView assessment={active.assessment} onBack={async ()=>{ setActive(null); await refreshMeta(); }} analysis={active.analysis} />;

  function statusFor(a: Assessment) {
    const e = eligibility[a.id];
    const now = new Date();
    const startAt = (a as any).start_at ? new Date((a as any).start_at) : null;
    const endAt = (a as any).end_at ? new Date((a as any).end_at) : null;
    // Prefer server eligibility when available
    if (e) {
      const reasons: string[] = Array.isArray(e.reasons) ? e.reasons : [];
      if (e.can_resume) return { label: 'Resume available', disabled: false };
      if (e.can_start) return { label: 'Ready', disabled: false };
      if (reasons.includes('attempts_exhausted')) return { label: 'Not enough attempts', disabled: true };
      if (reasons.includes('resume_count_exceeded')) return { label: 'Resume count exceeded', disabled: true };
      if (reasons.includes('time_frame_expired')) return { label: 'Time frame expired', disabled: true };
      if (reasons.includes('active_session_exists')) return { label: 'Active session exists', disabled: true };
      if (reasons.includes('not_found')) return { label: '', disabled: false };
    }
    // Fallback to local time window
    if (startAt && now < startAt) return { label: `Starts at ${startAt.toLocaleString()}`, disabled: true };
    if (endAt && now > endAt) return { label: `Ended at ${endAt.toLocaleString()}`, disabled: true };
    return { label: '', disabled: false };
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
        <button onClick={loadAll} className="px-3 py-1.5 text-sm rounded border">Reload</button>
      </div>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-4">
          {courses.map(c => (
            <div key={c.id} className="bg-white rounded-lg border">
              <div className="px-4 py-2 font-semibold">{c.title}</div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {(modulesByCourse[c.id]||[]).flatMap(m => (assessmentsByModule[m.id]||[]).map(a => ({ a, m }))).map(({a,m}) => {
                  const st = statusFor(a);
                  const canTake = !st.disabled;
                  const e = eligibility[a.id];
                  return (
                    <div key={a.id} className="border rounded-lg p-4 md:p-5 min-h-[120px]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-base font-semibold text-gray-900">{a.title} ({a.type.toUpperCase()})</div>
                          <div className="text-xs text-gray-500">Module: {m.title} • Duration: {a.duration_minutes} • Marks: {a.total_marks}</div>
                          {a.description && <div className="text-xs text-gray-500 mt-1 line-clamp-3">{a.description}</div>}
                          {a.start_at && <div className="text-xs text-gray-500 mt-1">Start: {new Date(a.start_at).toLocaleString()}</div>}
                          {st.label && <div className="text-xs text-gray-500 mt-1">{st.label}</div>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {/* Score summary after submission */}
                          {(() => {
                            const mine = eligibility[a.id];
                            const latestScore = mine?.latest?.score ?? null;
                            if (latestScore == null) return null;
                            return (
                              <div className="text-xs text-gray-600 text-right">Score: <span className="font-medium">{latestScore}</span> / {a.total_marks}</div>
                            );
                          })()}
                          {(() => {
                            const mine = subsByAssessment[a.id];
                            const count = mine?.count || 0;
                            return count > 0 ? (
                              <div className="text-[11px] text-gray-500">Attempts used: {count}{eligibility[a.id]?.attempts?.allowed ? ` / ${eligibility[a.id]?.attempts?.allowed}` : ''}</div>
                            ) : null;
                          })()}
                          <div className="flex gap-2">
                            <button
                              onClick={()=>{
                                // Navigate; StudentAssessmentView will enforce server-side eligibility and start/resume
                                setActive({ assessment: a });
                              }}
                              disabled={st.disabled}
                              className="px-3 py-1.5 text-sm rounded border disabled:opacity-50"
                            >
                              {(e?.can_resume ? 'Resume' : 'Take Test')}
                            </button>
                            {(() => {
                              const mine = subsByAssessment[a.id];
                              const attempts = mine?.count || 0;
                              const now = new Date();
                              const enabledByAdmin = (a.show_results_immediately === true) || (a.results_force_enabled === true) || (!!a.results_release_at && now >= new Date(a.results_release_at));
                              return (attempts > 0 && enabledByAdmin) ? (
                                <button onClick={()=> setActive({ assessment: a, analysis: true })} className="px-3 py-1.5 text-sm rounded border">View Score & Analysis</button>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {Object.values(assessmentsByModule).flat().length===0 && (
                  <div className="text-sm text-gray-500">No assessments available</div>
                )}
              </div>
            </div>
          ))}
          {courses.length===0 && <div className="text-gray-500">No courses assigned</div>}
        </div>
      )}
    </div>
  );
}
