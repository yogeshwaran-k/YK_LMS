import CodeMirrorEditor from '../common/CodeMirrorEditor';

export default function SubmissionDetail({ submission, user, onBack }: { submission: any; user: any; onBack: ()=>void }) {
  const payload = submission?.payload || {};
  const report: Array<{ status:string; weightage?: number }> = payload.report || [];
  const total = report.length;
  const passed = report.filter(r=>r.status==='Pass').length;
  const totalWeight = report.reduce((s,r)=> s + (r.weightage ?? 1), 0);
  const passedWeight = report.filter(r=>r.status==='Pass').reduce((s,r)=> s + (r.weightage ?? 1), 0);

  const started = submission.started_at ? new Date(submission.started_at) : null;
  const ended = submission.created_at ? new Date(submission.created_at) : null;
  const elapsed = submission.elapsed_seconds ?? (started && ended ? Math.round((ended.getTime()-started.getTime())/1000) : null);

  return (
    <div>
      <button onClick={onBack} className="text-blue-600 hover:text-blue-700">← Back</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Submission Detail</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold mb-2">Learner</div>
          <div className="text-sm text-gray-900">{user?.full_name||submission.user_id}</div>
          <div className="text-xs text-gray-500">{user?.email||''}</div>
        </div>
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold mb-2">Timing</div>
          <div className="text-sm">Start: {started ? started.toLocaleString() : '-'}</div>
          <div className="text-sm">End: {ended ? ended.toLocaleString() : '-'}</div>
          <div className="text-sm">Time took: {elapsed != null ? `${Math.floor(elapsed/60)}m ${elapsed%60}s` : '-'}</div>
        </div>
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold mb-2">Score & Tests</div>
          <div className="text-sm">Score: {submission.score ?? '-'}</div>
          <div className="text-sm">Tests: {passed}/{total}</div>
          <div className="text-sm">Weight: {passedWeight}/{totalWeight}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 mb-4">
        <div className="font-semibold text-gray-900 mb-2">Learner Code ({submission.language||'-'})</div>
        <CodeMirrorEditor value={payload.code||''} onChange={()=>{}} language={(submission.language||'javascript')} />
      </div>

      <div className="bg-white rounded-lg border p-4">
        <div className="font-semibold text-gray-900 mb-2">Test Report</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Weight</th>
              <th className="py-2 pr-4">Expected</th>
              <th className="py-2 pr-4">Actual</th>
            </tr>
          </thead>
          <tbody>
            {(payload.report||[]).map((r:any, i:number)=> (
              <tr key={i} className="border-t">
                <td className="py-2 pr-4">{i+1}</td>
                <td className="py-2 pr-4 capitalize">{r.kind||'-'}</td>
                <td className={`py-2 pr-4 ${r.status==='Pass'?'text-green-600':'text-red-600'}`}>{r.status}</td>
                <td className="py-2 pr-4">{r.weightage ?? '-'}</td>
                <td className="py-2 pr-4"><code>{r.expected}</code></td>
                <td className="py-2 pr-4"><code>{r.actual}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}