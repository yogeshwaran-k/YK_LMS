import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import StudentAssessmentView from './StudentAssessmentView';

interface Course { id: string; title: string }
interface Module { id: string; title: string }
interface Assessment { id: string; title: string; type: 'mcq'|'coding'|'assignment'; duration_minutes: number; total_marks: number; allowed_languages?: string[] }

export default function StudentAssessments() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modulesByCourse, setModulesByCourse] = useState<Record<string, Module[]>>({});
  const [assessmentsByModule, setAssessmentsByModule] = useState<Record<string, Assessment[]>>({});
  const [active, setActive] = useState<Assessment|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ (async()=>{
    setLoading(true);
    try {
      const cs = await api.get<Course[]>('/me/courses').catch(()=>[] as Course[]);
      setCourses(cs);
      for (const c of cs) {
        const ms = await api.get<Module[]>(`/courses/${c.id}/modules`);
        setModulesByCourse(prev=>({ ...prev, [c.id]: ms }));
        for (const m of ms) {
          const as = await api.get<Assessment[]>(`/assessments/modules/${m.id}`);
          setAssessmentsByModule(prev=>({ ...prev, [m.id]: as }));
        }
      }
    } finally { setLoading(false); }
  })(); }, []);

  if (active) return <StudentAssessmentView assessment={active} onBack={()=>setActive(null)} />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Assessments</h1>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-4">
          {courses.map(c => (
            <div key={c.id} className="bg-white rounded-lg border">
              <div className="px-4 py-2 font-semibold">{c.title}</div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {(modulesByCourse[c.id]||[]).flatMap(m => (assessmentsByModule[m.id]||[]).map(a => ({ a, m }))).map(({a,m}) => (
                  <div key={a.id} className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{a.title} ({a.type.toUpperCase()})</div>
                        <div className="text-xs text-gray-500">Module: {m.title} • Duration: {a.duration_minutes} • Marks: {a.total_marks}</div>
                      </div>
                      <button onClick={()=>setActive(a)} className="text-blue-600 hover:text-blue-800 text-sm">Open</button>
                    </div>
                  </div>
                ))}
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