import { useEffect, useState } from 'react';
import CodeMirrorEditor from '../common/CodeMirrorEditor';
import { api } from '../../lib/api';

export default function LiveMonitorDetail({ assessmentId, sessionId, onBack }: { assessmentId: string; sessionId: string; onBack: ()=>void }) {
  const [detail, setDetail] = useState<any|null>(null);

  useEffect(()=>{
    async function load(){
      try { setDetail(await api.get(`/assessments/${assessmentId}/sessions/${sessionId}/live`)); } catch {}
    }
    load();
    const t = setInterval(load, 4000);
    return ()=> clearInterval(t);
  }, [assessmentId, sessionId]);

  if (!detail) return (
    <div>
      <button onClick={onBack} className="text-blue-600 hover:text-blue-700">← Back</button>
      <div className="text-gray-500 mt-4">Loading...</div>
    </div>
  );

  const user = detail.user;
  const session = detail.session;
  const snapshot = detail.snapshot;
  const proctor = detail.proctor || { tab_switches: 0 };
  const code = snapshot?.code || '';
  const report = (snapshot?.last_report as any[]) || [];

  return (
    <div>
      <button onClick={onBack} className="text-blue-600 hover:text-blue-700">← Back</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Live Session Detail</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold mb-2">Learner</div>
          <div className="text-sm text-gray-900">{user?.full_name||session.user_id}</div>
          <div className="text-xs text-gray-500">{user?.email||''}</div>
        </div>
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold mb-2">Session</div>
          <div className="text-sm">Started: {session.started_at ? new Date(session.started_at).toLocaleString() : '-'}</div>
          <div className="text-sm">Resumes: {session.resume_count ?? 0}</div>
          <div className="text-sm">Status: {session.status}</div>
        </div>
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold mb-2">Proctoring</div>
          <div className="text-sm">Tab switches: {proctor.tab_switches}</div>
          <div className="mt-2 text-right">
            <button onClick={async ()=>{ await api.post(`/assessments/${assessmentId}/sessions/${sessionId}/force-submit`); }} className="px-3 py-1.5 border rounded">Force Submit</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-3">
          <div className="font-semibold text-gray-900 mb-2">Live Code</div>
          <CodeMirrorEditor value={code} onChange={()=>{}} language={'javascript'} />
        </div>
        <div className="bg-white rounded-lg border p-3">
          <div className="font-semibold text-gray-900 mb-2">Last Test Report</div>
          {report.length===0 ? (
            <div className="text-gray-500 text-sm">No report yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500"><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Weight</th><th className="py-2 pr-3">Expected</th><th className="py-2 pr-3">Actual</th></tr></thead>
              <tbody>
                {report.map((r:any,i:number)=> (
                  <tr key={i} className="border-t"><td className="py-1 pr-3">{i+1}</td><td className={`py-1 pr-3 ${r.status==='Pass'?'text-green-600':'text-red-600'}`}>{r.status}</td><td className="py-1 pr-3">{r.weightage ?? '-'}</td><td className="py-1 pr-3"><code>{r.expected}</code></td><td className="py-1 pr-3"><code>{r.actual}</code></td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
