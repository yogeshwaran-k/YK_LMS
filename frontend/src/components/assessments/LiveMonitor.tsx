import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';

export default function LiveMonitor() {
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [modules, setModules] = useState<Array<{ id: string; title: string }>>([]);
  const [assessments, setAssessments] = useState<Array<{ id: string; title: string; type: string }>>([]);
  const [courseId, setCourseId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [assessmentId, setAssessmentId] = useState('');
  const [data, setData] = useState<{ sessions: any[]; users: any[]; snapshots: any[] }|null>(null);
  const [q, setQ] = useState('');

  useEffect(()=>{ (async()=>{ setCourses(await api.get('/courses')); })(); }, []);
  useEffect(()=>{ (async()=>{ if (!courseId) { setModules([]); setModuleId(''); return; } setModules(await api.get(`/courses/${courseId}/modules`)); })(); }, [courseId]);
  useEffect(()=>{ (async()=>{ if (!moduleId) { setAssessments([]); setAssessmentId(''); return; } setAssessments(await api.get(`/assessments/modules/${moduleId}`)); })(); }, [moduleId]);
  useEffect(()=>{
    let t: any;
    async function load(){ if (!assessmentId) { setData(null); return; } try { setData(await api.get(`/assessments/${assessmentId}/live`)); } catch { setData(null); } }
    load();
    t = setInterval(load, 5000);
    return ()=> clearInterval(t);
  }, [assessmentId]);

  const byUser = useMemo(()=>{
    const map: Record<string, any> = {};
    if (!data) return map;
    const users = new Map((data.users||[]).map((u:any)=>[u.id,u]));
    for (const s of (data.sessions||[])) {
      const u = users.get(s.user_id);
      map[s.user_id] = { session: s, user: u, snapshot: (data.snapshots||[]).find((x:any)=>x.session_id===s.id) };
    }
    return map;
  }, [data]);

  const rows = Object.values(byUser).filter((r:any)=>{
    if (!q.trim()) return true;
    const hay = `${r.user?.full_name||''} ${r.user?.email||''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Live Monitor</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <select value={courseId} onChange={(e)=> setCourseId(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Select course</option>
          {courses.map(c=> <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select value={moduleId} onChange={(e)=> setModuleId(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Select module</option>
          {modules.map(m=> <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
        <select value={assessmentId} onChange={(e)=> setAssessmentId(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Select assessment</option>
          {assessments.map(a=> <option key={a.id} value={a.id}>{a.title} ({a.type})</option>)}
        </select>
        <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search learner" className="border rounded px-2 py-1" />
      </div>

      {!assessmentId ? (
        <div className="text-gray-500">Select an assessment</div>
      ) : (
        <div className="bg-white rounded border">
          <div className="px-4 py-3 border-b font-semibold">Active Sessions</div>
          <div className="p-3 overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500"><th className="py-2 pr-3">Learner</th><th className="py-2 pr-3">Started</th><th className="py-2 pr-3">Resumes</th><th className="py-2 pr-3">Code/Activity</th><th className="py-2 pr-3 text-right">Actions</th></tr></thead>
              <tbody>
                {rows.map((r:any)=> (
                  <tr key={r.session.id} className="border-t">
                    <td className="py-2 pr-3"><div className="font-medium text-gray-900">{r.user?.full_name||r.session.user_id}</div><div className="text-xs text-gray-500">{r.user?.email||''}</div></td>
                    <td className="py-2 pr-3">{new Date(r.session.started_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{r.session.resume_count}</td>
                    <td className="py-2 pr-3 whitespace-pre-wrap text-xs">{r.snapshot?.code ? (r.snapshot.code.slice(0,200)+'…') : '—'}</td>
                    <td className="py-2 pr-3 text-right">
                      <button onClick={async ()=>{ await api.post(`/assessments/${assessmentId}/sessions/${r.session.id}/force-submit`); }} className="px-2 py-1 border rounded">Force Submit</button>
                    </td>
                  </tr>
                ))}
                {rows.length===0 && (<tr><td colSpan={5} className="text-center text-gray-500 py-6">No active sessions</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
