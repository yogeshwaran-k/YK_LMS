import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Loader2 } from 'lucide-react';

interface Course { id: string; title: string }
interface Module { id: string; title: string }
interface Assessment { id: string; title: string; type: 'mcq'|'coding'|'assignment' }
interface Submission { id: string; user_id: string; assessment_id: string; type: string; score?: number; language?: string; created_at: string; payload?: any }
interface User { id: string; full_name: string; email: string }

export default function AssessmentResults({ onBack }: { onBack: () => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<Course|null>(null);
  const [selectedModule, setSelectedModule] = useState<Module|null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment|null>(null);

  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);

  useEffect(()=>{ (async()=>{ setCourses(await api.get<Course[]>('/courses')); setUsers(await api.get<User[]>('/users')); })(); }, []);
  useEffect(()=>{ if (selectedCourse) (async()=> setModules(await api.get<Module[]>(`/courses/${selectedCourse.id}/modules`)))(); else setModules([]); }, [selectedCourse?.id]);
  useEffect(()=>{ if (selectedModule) (async()=> setAssessments(await api.get<Assessment[]>(`/assessments/modules/${selectedModule.id}`)))(); else setAssessments([]); }, [selectedModule?.id]);

  async function fetchSubs(assessmentId?: string){
    setLoading(true);
    try{
      const url = assessmentId ? `/submissions?assessment_id=${assessmentId}` : '/submissions';
      const data = await api.get<Submission[]>(url);
      setSubs(data);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900">Assessment Results</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>fetchSubs(selectedAssessment?.id)} className="px-3 py-1.5 border rounded">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold text-sm mb-2">Course</div>
          <div className="space-y-1 max-h-64 overflow-auto">
            {courses.map(c=> (
              <button key={c.id} onClick={()=>{ setSelectedCourse(c); setSelectedModule(null); setSelectedAssessment(null); }} className={`w-full text-left px-2 py-1 rounded ${selectedCourse?.id===c.id?'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}>{c.title}</button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold text-sm mb-2">Module</div>
          <div className="space-y-1 max-h-64 overflow-auto">
            {modules.map(m=> (
              <button key={m.id} onClick={()=>{ setSelectedModule(m); setSelectedAssessment(null); }} className={`w-full text-left px-2 py-1 rounded ${selectedModule?.id===m.id?'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}>{m.title}</button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold text-sm mb-2">Assessment</div>
          <div className="space-y-1 max-h-64 overflow-auto">
            {assessments.map(a=> (
              <button key={a.id} onClick={()=>{ setSelectedAssessment(a); fetchSubs(a.id); }} className={`w-full text-left px-2 py-1 rounded ${selectedAssessment?.id===a.id?'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}>{a.title} <span className="text-xs text-gray-500">({a.type})</span></button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold text-sm mb-2">Filters</div>
          <div className="text-xs text-gray-500">More filters coming soon</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Submissions {selectedAssessment ? `for ${selectedAssessment.title}` : ''}</div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        </div>
        <div className="p-4 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Learner</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Language</th>
                <th className="py-2 pr-4">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(s => {
                const u = users.find(u=>u.id===s.user_id);
                return (
                  <tr key={s.id} className="border-t">
                    <td className="py-2 pr-4">
                      <div className="font-medium text-gray-900">{u?.full_name||'Unknown'}</div>
                      <div className="text-xs text-gray-500">{u?.email||s.user_id}</div>
                    </td>
                    <td className="py-2 pr-4 uppercase">{s.type}</td>
                    <td className="py-2 pr-4">{s.score ?? '-'}</td>
                    <td className="py-2 pr-4">{s.language || '-'}</td>
                    <td className="py-2 pr-4">{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
              {subs.length===0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-6">No submissions yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
