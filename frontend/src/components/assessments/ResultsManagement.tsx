import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import SubmissionDetail from './SubmissionDetail';

interface Course { id: string; title: string }
interface Module { id: string; title: string }
interface Assessment { id: string; title: string; type: 'mcq'|'coding'|'assignment' }
interface Submission { id: string; user_id: string; assessment_id: string; type: string; score?: number; language?: string; created_at: string; started_at?: string; elapsed_seconds?: number; payload?: any }
interface User { id: string; full_name: string; email: string }

export default function ResultsManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedCourse, setSelectedCourse] = useState<Course|null>(null);
  const [selectedModule, setSelectedModule] = useState<Module|null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment|null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission|null>(null);

  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);

  useEffect(()=>{ (async()=>{ setCourses(await api.get<Course[]>('/courses')); setUsers(await api.get<User[]>('/users')); })(); }, []);
  useEffect(()=>{ if (selectedCourse) (async()=> setModules(await api.get<Module[]>(`/courses/${selectedCourse.id}/modules`)))(); else setModules([]); }, [selectedCourse?.id]);
  useEffect(()=>{ if (selectedModule) (async()=> setAssessments(await api.get<Assessment[]>(`/assessments/modules/${selectedModule.id}`)))(); else setAssessments([]); }, [selectedModule?.id]);
  useEffect(()=>{ if (selectedAssessment) (async()=>{ setLoading(true); try { const data = await api.get<Submission[]>(`/submissions?assessment_id=${selectedAssessment.id}`); setSubs(data); } finally { setLoading(false); } })(); else setSubs([]); }, [selectedAssessment?.id]);

  if (selectedSubmission) {
    return <SubmissionDetail submission={selectedSubmission} user={users.find(u=>u.id===selectedSubmission.user_id)||null} onBack={()=> setSelectedSubmission(null)} />;
  }

  const groupedByUser = subs.reduce((acc: Record<string, Submission[]>, s) => { (acc[s.user_id] ||= []).push(s); return acc; }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Results</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
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
              <button key={a.id} onClick={()=> setSelectedAssessment(a)} className={`w-full text-left px-2 py-1 rounded ${selectedAssessment?.id===a.id?'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}>{a.title} <span className="text-xs text-gray-500">({a.type})</span></button>
            ))}
          </div>
        </div>
      </div>

      {selectedAssessment && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold">Learners for {selectedAssessment.title}</div>
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
          </div>
          <div className="p-4 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">Learner</th>
                  <th className="py-2 pr-4">Attempts</th>
                  <th className="py-2 pr-4">Last Score</th>
                  <th className="py-2 pr-4">Last Submitted</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedByUser).map(([uid, attempts]) => {
                  const u = users.find(x=>x.id===uid);
                  const sorted = [...attempts].sort((a,b)=> new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
                  const last = sorted[0];
                  return (
                    <tr key={uid} className="border-t">
                      <td className="py-2 pr-4">
                        <div className="font-medium text-gray-900">{u?.full_name||uid}</div>
                        <div className="text-xs text-gray-500">{u?.email||'-'}</div>
                      </td>
                      <td className="py-2 pr-4">{attempts.length}</td>
                      <td className="py-2 pr-4">{last?.score ?? '-'}</td>
                      <td className="py-2 pr-4">{last ? new Date(last.created_at).toLocaleString() : '-'}</td>
                      <td className="py-2 pr-4 text-right"><button className="px-2 py-1 border rounded" onClick={()=> setSelectedSubmission(last!)}>View</button></td>
                    </tr>
                  );
                })}
                {subs.length===0 && (
                  <tr><td colSpan={5} className="text-center text-gray-500 py-6">No submissions</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
