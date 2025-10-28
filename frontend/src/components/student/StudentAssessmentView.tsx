import { useEffect, useState, useRef } from 'react';
import { api } from '../../lib/api';
import CodeMirrorEditor from '../common/CodeMirrorEditor';

interface Assessment { id: string; title: string; type: 'mcq'|'coding'|'assignment'; description?: string }
interface MCQ { id: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: 'a'|'b'|'c'|'d'; marks: number }
interface CodingQ { id: string; title: string; description: string; starter_code: string; }
interface TestCase { id: string; input: string; expected_output: string; is_hidden: boolean; weightage: number }
interface Assignment { id: string; title: string; description: string; max_file_size_mb: number; allowed_file_types: string[]; deadline: string | null }

export default function StudentAssessmentView({ assessment, onBack }: { assessment: Assessment & { allowed_languages?: string[] }; onBack: () => void }) {
  if (assessment.type === 'mcq') return <MCQRunner assessment={assessment} onBack={onBack} />;
  if (assessment.type === 'coding') return <CodingRunner assessment={assessment} onBack={onBack} />;
  return <AssignmentView assessment={assessment} onBack={onBack} />;
}

function MCQRunner({ assessment, onBack }: { assessment: Assessment & { show_results_immediately?: boolean; allowed_attempts?: number }; onBack: () => void }) {
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, 'a'|'b'|'c'|'d'|undefined>>({});
  const [idx, setIdx] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [view, setView] = useState<'test'|'result'|'analysis'>('test');

  useEffect(() => { (async () => { const qs = await api.get<MCQ[]>(`/assessments/${assessment.id}/mcq-questions`); setQuestions(qs); })(); (async ()=>{ const m = await api.get<{count:number}>(`/submissions/mine?assessment_id=${assessment.id}`); setAttempts(m.count || 0); })(); }, [assessment.id]);

  function score() {
    let s = 0; for (const q of questions) if (answers[q.id] === q.correct_option) s += q.marks;
    return s;
  }

  if (attempts >= (assessment.allowed_attempts || 1) && view==='test') {
    return (
      <div>
        <div className="mb-4">
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700">← Back</button>
          <h2 className="text-2xl font-bold text-gray-900">{assessment.title}</h2>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">No attempts left.</div>
      </div>
    );
  }

  if (view === 'result') {
    return (
      <div>
        <div className="mb-4">
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700">← Home</button>
          <h2 className="text-2xl font-bold text-gray-900">{assessment.title} - Result</h2>
        </div>
        {assessment.show_results_immediately ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-xl font-semibold text-gray-900 mb-2">Score: {score()} / {questions.reduce((s,q)=>s+q.marks,0)}</div>
            <button onClick={()=>setView('analysis')} className="mt-2 px-4 py-2 border rounded hover:bg-gray-50">View Analysis</button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">Results will be released later.</div>
        )}
      </div>
    );
  }

  if (view === 'analysis') {
    const total = questions.length;
    const correct = questions.filter(q => answers[q.id] === q.correct_option).length;
    const wrong = total - correct - Object.values(answers).filter(a=>a===undefined).length;
    const unanswered = total - correct - wrong;
    return (
      <div>
        <div className="mb-4">
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700">← Home</button>
          <h2 className="text-2xl font-bold text-gray-900">{assessment.title} - Analysis</h2>
        </div>
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <div className="text-sm text-gray-700">Total: {total} • Correct: {correct} • Wrong: {wrong} • Unanswered: {unanswered}</div>
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-lg shadow p-4">
              <div className="font-medium text-gray-900 mb-2">Q{i+1}. {q.question_text}</div>
              <div className={`text-sm mb-2 ${answers[q.id]===q.correct_option ? 'text-green-700' : 'text-red-700'}`}>Status: {answers[q.id]===q.correct_option ? 'Correct' : (answers[q.id] ? 'Wrong' : 'Unanswered')}</div>
              <div className="text-sm text-gray-700">Your answer: {answers[q.id] ? (answers[q.id] as string).toUpperCase() : '-'}</div>
              <div className="text-sm text-gray-700">Correct answer: {q.correct_option.toUpperCase()}</div>
              {/* Optional explanation, if present in backend */}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const q = questions[idx];
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-blue-600 hover:text-blue-700">← Back</button>
          <h2 className="text-2xl font-bold text-gray-900">{assessment.title}</h2>
        </div>
        <div className="text-sm text-gray-600">Attempt {attempts+1} / {assessment.allowed_attempts || 1}</div>
      </div>

      {q && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="font-medium text-gray-900 mb-2">Q{idx+1} of {questions.length}. {q.question_text}</div>
          {(['a','b','c','d'] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 py-1">
              <input type="radio" name={q.id} checked={answers[q.id]===opt} onChange={()=>setAnswers(prev=>({ ...prev, [q.id]: opt }))} />
              <span className="text-sm text-gray-800">{q[`option_${opt}` as const]}</span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button disabled={idx===0} onClick={()=>setIdx(i=>Math.max(0,i-1))} className="px-3 py-1.5 border rounded disabled:opacity-50">Prev</button>
        <button disabled={idx>=questions.length-1} onClick={()=>setIdx(i=>Math.min(questions.length-1,i+1))} className="px-3 py-1.5 border rounded disabled:opacity-50">Next</button>
        <div className="flex-1" />
        <button onClick={async ()=>{ await api.post('/submissions', { assessment_id: assessment.id, type: 'mcq', score: score(), payload: { answers } }); setView('result'); }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Submit Test</button>
      </div>
    </div>
  );
}

function CodingRunner({ assessment, onBack }: { assessment: Assessment; onBack: () => void }) {
  const [questions, setQuestions] = useState<CodingQ[]>([]);
  const [selected, setSelected] = useState<CodingQ | null>(null);
  const [tests, setTests] = useState<TestCase[]>([]);
  const [code, setCode] = useState<string>('');
  const [stdin, setStdin] = useState('');
  const [stdout, setStdout] = useState('');
  const [runSummary, setRunSummary] = useState<{ passed: number; total: number } | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  type ResultRow = { idx: number; status: 'Pass'|'Fail'; expected: string; actual: string; kind: 'sample' | 'hidden'; test_case_id?: string; weightage?: number };
  const [resultsRows, setResultsRows] = useState<ResultRow[]>([]);
  const [lastSubmitRows, setLastSubmitRows] = useState<typeof resultsRows | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [language, setLanguage] = useState<'javascript'|'python'|'cpp'|'c'|'java'|'typescript'>( ((assessment as any).allowed_languages?.[0]) || 'javascript');
  const [timeLeft, setTimeLeft] = useState<number>(Math.max(1, (assessment as any).duration_minutes || 60) * 60);
  const startedAt = useRef<number>(Date.now());
  const codeKey = `code_${assessment.id}`;

  useEffect(() => { (async () => { const qs = await api.get<CodingQ[]>(`/assessments/${assessment.id}/coding-questions`); setQuestions(qs); if (qs[0]) setSelected(qs[0]); })(); const saved = localStorage.getItem(codeKey); if (saved) setCode(saved); }, [assessment.id]);
  useEffect(() => {
    const t = setInterval(() => setTimeLeft((s)=> (s>0? s-1: 0)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { (async () => { if (selected) { const t = await api.get<TestCase[]>(`/assessments/coding-questions/${selected.id}/test-cases`); setTests(t); } })(); }, [selected?.id]);

  return (
    <div>
      <div className="mb-4">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700">← Back</button>
        <h2 className="text-2xl font-bold text-gray-900">{assessment.title}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Questions</h3>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <button key={q.id} onClick={()=>setSelected(q)} className={`w-full text-left p-2 rounded border ${selected?.id===q.id?'border-blue-500 bg-blue-50':'border-gray-200 hover:border-gray-300'}`}>Q{i+1}. {q.title}</button>
              ))}
              {questions.length === 0 && <div className="text-sm text-gray-500">No coding questions</div>}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Problem Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{(selected?.description)|| 'No description'}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Constraints</h3>
            <ul className="list-disc pl-5 text-sm text-gray-700">
              <li>Time limit and memory limit as configured</li>
              <li>Follow input/output formats</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Sample Test Cases</h3>
            <ul className="list-disc pl-5 text-sm text-gray-700">
              {tests.filter(t=>!t.is_hidden).map(t=> (
                <li key={t.id}><span className="text-gray-500">input:</span> <code>{t.input}</code> <span className="text-gray-500">expected:</span> <code>{t.expected_output}</code></li>
              ))}
              {tests.filter(t=>!t.is_hidden).length===0 && <li>No sample tests</li>}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {selected && (
            <>
              <div className="rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">Code</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">Time left: <span className={`${timeLeft <= Math.max(1, ((assessment as any).duration_minutes||60)*60)*0.1 ? 'text-red-600 font-semibold' : ''}`}>{formatTime(timeLeft)}</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={language} onChange={(e)=>setLanguage(e.target.value as any)} className="px-2 py-1 text-sm border rounded dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                      {((assessment as any).allowed_languages || ['javascript','python','cpp','c','java','typescript']).map((l:string)=> (
                        <option key={l} value={l}>{l[0].toUpperCase()+l.slice(1)}</option>
                      ))}
                    </select>
                    <button onClick={()=>{ localStorage.setItem(codeKey, code); }} className="px-3 py-1.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">Save Code</button>
                    <button onClick={async ()=>{
                      const res = await api.post<{ stdout: string }>(`/runner/execute`, { language, code, stdin });
                      setStdout(res.stdout || '');
                    }} className="px-3 py-1.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">Run</button>
                    <button onClick={async ()=>{
                      setIsRunning(true);
                      setResultsOpen(true);
                      const all = tests.filter(t=>!t.is_hidden);
                      const rows: ResultRow[] = [];
                      let passed = 0;
                      for (let i=0;i<all.length;i++) {
                        const t = all[i];
                        const res = await api.post<{ stdout: string }>(`/runner/execute`, { language, code, stdin: t.input });
                        const out = (res.stdout || '').trim();
                        const exp = (t.expected_output || '').trim();
                        const ok = out === exp; if (ok) passed++;
                        rows.push({ idx: i+1, status: ok ? 'Pass' : 'Fail', expected: exp, actual: out, kind: 'sample', test_case_id: t.id, weightage: t.weightage });
                      }
                      setRunSummary({ passed, total: all.length });
                      setResultsRows(rows);
                      setResultsOpen(true);
                      setIsRunning(false);
                    }} disabled={isRunning} className="px-3 py-1.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 disabled:opacity-50">Run Test</button>
                    <button onClick={async ()=>{
                      setIsRunning(true);
                      setResultsOpen(true);
                      const samples = tests.filter(t=>!t.is_hidden);
                      const hidden = tests.filter(t=>t.is_hidden);
                      const rows: ResultRow[] = [];
                      let passed = 0;
                      for (let i=0;i<samples.length;i++) {
                        const t = samples[i];
                        const res = await api.post<{ stdout: string }>(`/runner/execute`, { language, code, stdin: t.input });
                        const out = (res.stdout || '').trim();
                        const exp = (t.expected_output || '').trim();
                        const ok = out === exp; if (ok) passed++;
                        rows.push({ idx: i+1, status: ok ? 'Pass' : 'Fail', expected: exp, actual: out, kind: 'sample', test_case_id: t.id, weightage: t.weightage });
                      }
                      for (let i=0;i<hidden.length;i++) {
                        const t = hidden[i];
                        const res = await api.post<{ stdout: string }>(`/runner/execute`, { language, code, stdin: t.input });
                        const out = (res.stdout || '').trim();
                        const exp = (t.expected_output || '').trim();
                        const ok = out === exp; if (ok) passed++;
                        rows.push({ idx: samples.length + i + 1, status: ok ? 'Pass' : 'Fail', expected: exp, actual: out, kind: 'hidden', test_case_id: t.id, weightage: t.weightage });
                      }
                      setRunSummary({ passed, total: samples.length + hidden.length });
                      setResultsRows(rows);
                      setLastSubmitRows(rows);
                      setResultsOpen(true);
                      setIsRunning(false);
                    }} disabled={isRunning} className="px-3 py-1.5 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 disabled:opacity-50">Submit Project</button>
                    <button onClick={async ()=>{
                      if (!lastSubmitRows) return;
                      const score = lastSubmitRows.filter(r=>r.status==='Pass').length;
                      await api.post('/submissions', { assessment_id: assessment.id, type: 'coding', payload: { code, language, report: lastSubmitRows }, score, started_at: new Date(startedAt.current).toISOString(), elapsed_seconds: Math.round((Date.now()-startedAt.current)/1000), question_ids: questions.map(q=>q.id) });
                      onBack();
                    }} disabled={!lastSubmitRows} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Submit Test</button>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-[#0f172a]">
                  <CodeMirrorEditor value={code} onChange={setCode} onSave={()=>localStorage.setItem(codeKey, code)} language={language} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4 pb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Custom Input (stdin)</label>
                    <textarea rows={4} value={stdin} onChange={(e)=>setStdin(e.target.value)} className="w-full border rounded p-2 font-mono text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Output</label>
                    <pre className="w-full border rounded p-2 font-mono text-xs whitespace-pre-wrap bg-white">{stdout || '—'}</pre>
                  </div>
                </div>
                {runSummary && (
                  <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-t border-gray-200 dark:border-gray-700">
                    Passed {runSummary.passed}/{runSummary.total} tests
                  </div>
                )}
              </div>

              {resultsOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow max-w-3xl w-full">
                    <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{isRunning ? 'Running...' : 'Test Results'}</div>
                      <button onClick={()=>setResultsOpen(false)} className="text-gray-600 hover:text-gray-900 dark:text-gray-300">✕</button>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      {isRunning ? (
                        <div className="text-center text-gray-600 py-8">Running test cases...</div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                          <tr className="text-left text-gray-500 dark:text-gray-400">
                            <th className="py-2 pr-4">S. No</th>
                            <th className="py-2 pr-4">Type</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Expected</th>
                            <th className="py-2 pr-4">Actual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultsRows.map(r => (
                            <tr key={r.idx} className="border-t dark:border-gray-700">
                              <td className="py-2 pr-4">{r.idx}</td>
                              <td className="py-2 pr-4 capitalize">{r.kind}</td>
                              <td className={`py-2 pr-4 ${r.status==='Pass' ? 'text-green-600' : 'text-red-600'}`}>{r.status}</td>
                              <td className="py-2 pr-4"><code>{r.expected}</code></td>
                              <td className="py-2 pr-4"><code>{r.actual}</code></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      )}
                    </div>
                    <div className="px-4 py-3 border-t dark:border-gray-700 text-right">
                      <button onClick={()=>setResultsOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Sample Tests</h3>
                <ul className="list-disc pl-5 text-sm text-gray-700">
                  {tests.filter(t=>!t.is_hidden).map(t=> (
                    <li key={t.id}><span className="text-gray-500">input:</span> <code>{t.input}</code> <span className="text-gray-500">expected:</span> <code>{t.expected_output}</code></li>
                  ))}
                  {tests.filter(t=>!t.is_hidden).length===0 && <li>No sample tests</li>}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignmentView({ assessment, onBack }: { assessment: Assessment; onBack: () => void }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => { (async () => { const a = await api.get<Assignment | null>(`/assessments/${assessment.id}/assignment`); setAssignment(a); })(); }, [assessment.id]);

  return (
    <div>
      <div className="mb-4">
        <button onClick={onBack} className="text-blue-600 hover:text-blue-700">← Back</button>
        <h2 className="text-2xl font-bold text-gray-900">{assessment.title}</h2>
      </div>
      {!assignment ? (
        <div className="text-gray-500">No assignment configured.</div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="text-gray-900 font-medium">{assignment.title}</div>
          <div className="text-gray-700 whitespace-pre-wrap text-sm">{assignment.description}</div>
          {assignment.deadline && <div className="text-xs text-gray-500">Deadline: {new Date(assignment.deadline).toLocaleString()}</div>}
          <div className="text-xs text-gray-500">Max file size: {assignment.max_file_size_mb} MB</div>
          <div className="text-xs text-gray-500">Allowed types: {assignment.allowed_file_types.join(', ')}</div>

          <div className="pt-2 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Submission Note (optional)</label>
            <textarea rows={4} value={note} onChange={(e)=>setNote(e.target.value)} className="w-full border rounded p-2 text-sm" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
              <input type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <button onClick={async ()=>{
                let filePayload: any = null;
                if (file) {
                  const buf = await file.arrayBuffer();
                  filePayload = { name: file.name, type: file.type, size: file.size, base64: btoa(String.fromCharCode(...new Uint8Array(buf))) };
                }
                await api.post('/submissions', { assessment_id: assessment.id, type: 'assignment', payload: { note, file: filePayload } });
              }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Submit Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(total: number) {
  const m = Math.floor(total/60); const s = total % 60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

