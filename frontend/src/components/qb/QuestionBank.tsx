import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import BulkUploadMCQ from './BulkUploadMCQ';

export default function QuestionBank() {
  const [mode, setMode] = useState<'mcq'|'coding'>('mcq');
  const [banks, setBanks] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [selected, setSelected] = useState<string>('');
  const [qs, setQs] = useState<Array<any>>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [newQ, setNewQ] = useState({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', marks: 1, topic: '', difficulty: 'medium', explanation: '' });
  const [newCodeQ, setNewCodeQ] = useState({ title: '', description: '', starter_code: '', difficulty: 'medium', marks: 10 });

  async function refreshBanks(){
    setBanks(await api.get<any[]>(mode==='mcq'? '/mcq-banks' : '/coding-banks'));
  }
  useEffect(()=>{ (async()=>{ try { await refreshBanks(); } catch {} })(); }, [mode]);
  useEffect(()=>{ (async()=>{ if (!selected) { setQs([]); return; } try { setQs(await api.get<any[]>(mode==='mcq'? `/mcq-banks/${selected}/questions` : `/coding-banks/${selected}/questions`)); } catch { setQs([]); } })(); }, [selected, mode]);

  async function createBank(){ if (!name.trim()) return; await api.post(mode==='mcq'? '/mcq-banks' : '/coding-banks', { name, description: desc }); setName(''); setDesc(''); await refreshBanks(); }
  async function addQuestion(){ if (mode==='mcq') {
    if (!selected || !newQ.question_text.trim()) return; const payload = { ...newQ, marks: Number(newQ.marks)||1, topic: newQ.topic||undefined, difficulty: newQ.difficulty||undefined }; await api.post(`/mcq-banks/${selected}/questions`, payload); setNewQ({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'a', marks: 1, topic: '', difficulty: 'medium', explanation: '' }); setQs(await api.get<any[]>(`/mcq-banks/${selected}/questions`));
  } else {
    if (!selected || !newCodeQ.title.trim() || !newCodeQ.description.trim()) return; const payload = { ...newCodeQ, marks: Number(newCodeQ.marks)||10 }; await api.post(`/coding-banks/${selected}/questions`, payload); setNewCodeQ({ title: '', description: '', starter_code: '', difficulty: 'medium', marks: 10 }); setQs(await api.get<any[]>(`/coding-banks/${selected}/questions`));
  }}

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Question Bank</h1>
      <div className="mb-3 flex gap-2 text-sm">
        <button className={`px-3 py-1.5 border rounded ${mode==='mcq'?'bg-indigo-50 border-indigo-300':''}`} onClick={()=>{ setMode('mcq'); setSelected(''); }}>MCQ</button>
        <button className={`px-3 py-1.5 border rounded ${mode==='coding'?'bg-indigo-50 border-indigo-300':''}`} onClick={()=>{ setMode('coding'); setSelected(''); }}>Coding</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded p-3 border">
          <div className="font-semibold mb-2">Banks</div>
          <div className="space-y-2">
            {banks.map(b=> (
              <button key={b.id} onClick={()=>setSelected(b.id)} className={`w-full text-left px-2 py-1 rounded ${selected===b.id?'bg-indigo-50 text-indigo-700':'hover:bg-gray-50'}`}>{b.name}</button>
            ))}
            {banks.length===0 && <div className="text-sm text-gray-500">No banks yet</div>}
          </div>
          <div className="mt-3 border-t pt-3">
            <div className="font-semibold text-sm mb-1">Create Bank</div>
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Bank name" className="w-full border rounded px-2 py-1 mb-2" />
            <input value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Description (optional)" className="w-full border rounded px-2 py-1 mb-2" />
            <button onClick={createBank} className="px-3 py-1.5 border rounded">Create</button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded p-3 border">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Questions</div>
            {selected && <div className="text-xs text-gray-500">Bank ID: {selected}</div>}
          </div>
          <div className="mt-3 space-y-3 max-h-[70vh] overflow-auto">
            {qs.map((q,i)=> (
              <div key={q.id} className="border rounded p-3">
                {mode==='mcq' ? (
                  <>
                    <div className="font-medium text-gray-900 mb-2">Q{i+1}. {q.question_text}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {(['a','b','c','d'] as const).map(opt => (
                        <div key={opt} className={`p-2 rounded border ${q.correct_option===opt?'border-green-500 bg-green-50':'border-gray-200'}`}>
                          <span className="font-semibold mr-2">{opt.toUpperCase()}.</span>{q[`option_${opt}`]}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-medium text-gray-900 mb-1">Q{i+1}. {q.title}</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap mb-1">{q.description}</div>
                    {q.starter_code && (
                      <pre className="text-xs bg-gray-50 border rounded p-2 whitespace-pre-wrap">{q.starter_code}</pre>
                    )}
                  </>
                )}
              </div>
            ))}
            {qs.length===0 && <div className="text-sm text-gray-500">No questions in this bank</div>}
          </div>
          {selected && (
            <div className="mt-4 border-t pt-3">
              <div className="font-semibold text-sm mb-1">Add Question</div>
              {mode==='mcq' ? (
                <>
                  <textarea rows={3} value={newQ.question_text} onChange={(e)=>setNewQ({ ...newQ, question_text: e.target.value })} className="w-full border rounded px-2 py-1 mb-2" placeholder="Question text (supports markdown)" />
                  <div className="grid grid-cols-2 gap-2">
                    {(['a','b','c','d'] as const).map(opt => (
                      <input key={opt} value={(newQ as any)[`option_${opt}`]} onChange={(e)=> setNewQ({ ...newQ, [`option_${opt}`]: e.target.value } as any)} className="w-full border rounded px-2 py-1" placeholder={`Option ${opt.toUpperCase()}`} />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Correct</label>
                      <select value={newQ.correct_option} onChange={(e)=> setNewQ({ ...newQ, correct_option: e.target.value as any })} className="w-full border rounded px-2 py-1">
                        {(['a','b','c','d'] as const).map(o => (<option key={o} value={o}>{o.toUpperCase()}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Marks</label>
                      <input type="number" min={1} value={newQ.marks} onChange={(e)=> setNewQ({ ...newQ, marks: parseInt(e.target.value)||1 })} className="w-full border rounded px-2 py-1" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Topic (optional)</label>
                      <input value={newQ.topic} onChange={(e)=> setNewQ({ ...newQ, topic: e.target.value })} className="w-full border rounded px-2 py-1" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs text-gray-600 mb-1">Explanation (optional)</label>
                    <textarea rows={2} value={newQ.explanation} onChange={(e)=> setNewQ({ ...newQ, explanation: e.target.value })} className="w-full border rounded px-2 py-1" />
                  </div>
                </>
              ) : (
                <>
                  <input value={newCodeQ.title} onChange={(e)=> setNewCodeQ({ ...newCodeQ, title: e.target.value })} className="w-full border rounded px-2 py-1 mb-2" placeholder="Title" />
                  <textarea rows={4} value={newCodeQ.description} onChange={(e)=> setNewCodeQ({ ...newCodeQ, description: e.target.value })} className="w-full border rounded px-2 py-1 mb-2" placeholder="Description" />
                  <textarea rows={4} value={newCodeQ.starter_code} onChange={(e)=> setNewCodeQ({ ...newCodeQ, starter_code: e.target.value })} className="w-full border rounded px-2 py-1 mb-2 font-mono text-sm" placeholder="Starter code (optional)" />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Difficulty</label>
                      <select value={newCodeQ.difficulty as any} onChange={(e)=> setNewCodeQ({ ...newCodeQ, difficulty: e.target.value as any })} className="w-full border rounded px-2 py-1">
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Marks</label>
                      <input type="number" min={1} value={newCodeQ.marks as any} onChange={(e)=> setNewCodeQ({ ...newCodeQ, marks: parseInt(e.target.value)||10 })} className="w-full border rounded px-2 py-1" />
                    </div>
                  </div>
                </>
              )}
              <div className="text-right mt-2 flex gap-2 justify-end">
                {mode==='mcq' && (
                  <BulkUploadMCQ bankId={selected} onDone={async ()=> setQs(await api.get<any[]>(`/mcq-banks/${selected}/questions`))} />
                )}
                <button onClick={addQuestion} className="px-3 py-1.5 border rounded">Add</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
