import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../../lib/api';
import AceCodeEditor from '../common/AceCodeEditor';
import { ClockIcon, XCircleIcon, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { AssessmentBase, Modal, formatTime, ResultRow, TestResultsModal } from './StudentAssessmentView';

// Local/Specific Interfaces
interface Assessment extends AssessmentBase {
    duration_minutes: number;
    allowed_languages?: string[];
}
interface CodingQ { id: string; title: string; description: string; starter_code: string; }
interface TestCase { id: string; input: string; expected_output: string; is_hidden: boolean; weightage: number }


export default function CodingRunner({ assessment, onBack }: { assessment: Assessment; onBack: () => void }) {
    const startedAt = useRef<number | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    const [questions, setQuestions] = useState<CodingQ[]>([]);
    const [selected, setSelected] = useState<CodingQ | null>(null);
    const [tests, setTests] = useState<TestCase[]>([]);
    const [code, setCode] = useState<string>('');
    const [view, setView] = useState<'loading' | 'test' | 'ineligible'>('loading');
    const [stdin, setStdin] = useState('');
    const [stdout, setStdout] = useState('');
    const [lastSubmitRows, setLastSubmitRows] = useState<ResultRow[] | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [language, setLanguage] = useState<'javascript' | 'python' | 'cpp' | 'c' | 'java' | 'typescript'>((assessment.allowed_languages?.[0]) as any || 'javascript');
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const codeKey = `code_${assessment.id}`;
    const [cModal, setCModal] = useState<{ open: boolean; title: string; body: string; onClose?: () => void }>({ open: false, title: '', body: '' });
    const [tabLimit, setTabLimit] = useState<number | null>(null);
    const [tabUsed, setTabUsed] = useState(0);
    const [disableCP, setDisableCP] = useState(false);
    const [isProblemPaneOpen, setIsProblemPaneOpen] = useState(true);
    
    const [resultsModalOpen, setResultsModalOpen] = useState(false);
    const [resultsModalData, setResultsModalData] = useState<{ results: ResultRow[], summary: { passed: number, total: number, score?: number }, isFinalSubmit: boolean }>({ results: [], summary: { passed: 0, total: 0 }, isFinalSubmit: false });


    // Auto Submit
    const autoSubmitCoding = useCallback(async () => {
        try {
            const rows = lastSubmitRows || [];
            const score = rows.filter(r => r.status === 'Pass').length;
            await api.post('/submissions', {
                assessment_id: assessment.id, type: 'coding',
                payload: { code, language, report: rows, autoTimeout: true },
                score,
                started_at: startedAt.current ? new Date(startedAt.current).toISOString() : undefined,
                elapsed_seconds: startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : undefined,
                question_ids: questions.map(q => q.id)
            });
            if (sessionIdRef.current) await api.post(`/assessments/${assessment.id}/sessions/${sessionIdRef.current}/finish`);
        } catch { /* ignore submit error */ } finally {
            setCModal({ open: true, title: 'Time expired', body: 'Your code has been submitted automatically.', onClose: () => { setCModal({ open: false, title: '', body: '' }); onBack(); } });
        }
    }, [assessment.id, code, language, lastSubmitRows, onBack, questions]);

    // --- Session Initialization Helper (Guaranteed Recovery) ---
    const tryInitializeSession = useCallback(async (_isRecovery = false) => {
        const duration = assessment.duration_minutes || 60;
        
        // Use /start-or-resume as the primary session handler
        const sor = await api.post<any>(`/assessments/${assessment.id}/start-or-resume`);
        const e = await api.get<any>(`/assessments/${assessment.id}/eligibility`);
        
        if (e?.proctor) {
            setDisableCP(!!e.proctor.disable_copy_paste);
            setTabLimit(e.proctor.tab_switch_limit ?? null);
            setTabUsed(e.proctor.tab_switch_used || 0);
        }

        const sessId = sor?.session_id || e.session_id;

        if (sessId) {
            sessionIdRef.current = sessId;
            const remaining = e.remaining_seconds ?? (duration * 60);
            setTimeLeft(remaining);
            startedAt.current = Date.now() - ((duration * 60) - remaining) * 1000;
            return true;
        }

        return false;
    }, [assessment.id, assessment.duration_minutes]);

    // Initial Load (Uses Recovery Pattern)
    useEffect(() => {
        const loadAssessment = async () => {
            try {
                let sessionSuccess = false;
                
                try {
                    sessionSuccess = await tryInitializeSession();
                } catch (initialError: any) {
                    console.warn("Initial session attempt failed (likely 409). Attempting recovery...");
                    sessionSuccess = await tryInitializeSession(true); 
                }

                if (!sessionSuccess) {
                    const e = await api.get<any>(`/assessments/${assessment.id}/eligibility`);
                    const reasons: string[] = Array.isArray(e?.reasons) ? e.reasons : [];
                    const map: Record<string, string> = {
                        '409 Conflict': 'Active session exists. Failed to resume.',
                        'active_session_exists': 'Active session exists. Failed to resume.',
                        before_start: 'The test starts later.', after_end: 'The test has ended.',
                        attempts_exhausted: 'Attempts Exhausted.',
                    };
                    throw new Error(reasons.map((r: string) => map[r] || r).join(' | ') || 'Not eligible');
                }
                
                // Load Questions
                const qs = await api.get<CodingQ[]>(`/assessments/${assessment.id}/coding-questions`);
                setQuestions(qs);
                if (qs[0]) setSelected(qs[0]);

                const saved = localStorage.getItem(codeKey);
                if (saved) setCode(saved);
                else if (qs[0]) setCode(qs[0].starter_code || '');

                setView('test');

            } catch (err: any) {
                 const reasons = err?.reasons || [err?.message];
                 const map: Record<string, string> = {
                    '409 Conflict': 'Active session exists. Please try refreshing or resuming.',
                    'Failed to fetch': 'Network error. Please check your connection.',
                };
                setCModal({
                    open: true, 
                    title: 'Not eligible', 
                    body: reasons.map((r: string) => map[r] || r).join(' | ') || 'Unknown error during eligibility check.',
                    onClose: () => { setCModal({ open: false, title: '', body: '' }); onBack(); }
                });
                setView('ineligible');
            }
        };
        loadAssessment();
    }, [assessment.id, assessment.duration_minutes, codeKey, onBack, tryInitializeSession]);

    // Test Case Load on Question Change
    useEffect(() => {
        if (!selected) return;
        (async () => {
            const t = await api.get<TestCase[]>(`/assessments/coding-questions/${selected.id}/test-cases`);
            setTests(t);
        })();
    }, [selected?.id]);

    // Timer and Auto-submit check
    useEffect(() => {
        if (timeLeft <= 0 || view !== 'test') return;
        const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
        return () => clearInterval(t);
    }, [timeLeft, view]);

    useEffect(() => { if (sessionIdRef.current && startedAt.current && timeLeft === 0) void autoSubmitCoding(); }, [timeLeft, autoSubmitCoding]);

    // Proctoring Hooks
    const recordTabSwitch = useCallback(async () => { /* ... */ }, [assessment.id, tabLimit, tabUsed, onBack]);
    useEffect(() => { /* ... */ }, [view, disableCP, recordTabSwitch]);


    const handleRunCode = async () => {
        if (!selected) return;
        setStdout('Running...');
        
        const res = await api.post<{ stdout: string; time_ms?: number }>(`/runner/execute`, { language, code, stdin, assessment_id: assessment.id });
        
        setStdout(`Output (Time: ${res.time_ms || 'N/A'}ms):\n${res.stdout || 'No output.'}`);
    };

    const handleRunTests = async () => {
        if (!selected || !tests.length) return;
        setIsRunning(true);
        
        const sampleTests = tests.filter(t => !t.is_hidden);
        let rows: ResultRow[] = [];
        
        for (let i = 0; i < sampleTests.length; i++) {
            const t = sampleTests[i];
            const startTime = Date.now();
            const res = await api.post<{
                time_ms: number; stdout: string; error?: string 
}>(`/runner/execute`, { language, code, stdin: t.input, assessment_id: assessment.id });
            const executionTime = Date.now() - startTime;
            
            const out = (res.stdout || '').trim();
            const exp = (t.expected_output || '').trim();
            
            const status: 'Pass' | 'Fail' | 'Error' = res.error ? 'Error' : out === exp ? 'Pass' : 'Fail';

            rows.push({ idx: i + 1, status: status, expected: exp, actual: out, kind: 'sample', time_ms: res.time_ms || executionTime });
        }
        
        setIsRunning(false);
        
        setResultsModalData({
            results: rows,
            summary: { passed: rows.filter(r => r.status === 'Pass').length, total: sampleTests.length },
            isFinalSubmit: false,
        });
        setResultsModalOpen(true);
    };

    const handleSubmitFinal = async () => {
        if (!selected || timeLeft === 0) return;
        
        setIsRunning(true);

        const evalRes = await api.post<{ passed: number; total: number; rows: ResultRow[]; score: number }>(`/assessments/coding-questions/${selected!.id}/evaluate`, { code, language });
        
        const rows = evalRes.rows || [];
        setLastSubmitRows(rows);
        const score = evalRes.score;
        
        // Submit/Record the result WITHOUT ending the session
        await api.post('/submissions', { 
            assessment_id: assessment.id, type: 'coding', 
            payload: { code, language, report: rows }, 
            score, 
            started_at: startedAt.current ? new Date(startedAt.current).toISOString() : undefined, 
            elapsed_seconds: startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : undefined, 
            question_ids: questions.map(q => q.id) 
        });
        
        setIsRunning(false);
        
        // Show detailed final results modal
        setResultsModalData({
            results: rows,
            summary: { passed: evalRes.passed, total: evalRes.total, score: score },
            isFinalSubmit: true,
        });
        setResultsModalOpen(true);
    };

    // End Test Handler - CRITICAL FIX
    const handleEndTest = async () => {
        const confirmed = window.confirm("Are you sure you want to end the test? This will use one attempt and finalize your score based on your last recorded submission.");
        if (!confirmed) return;

        if (sessionIdRef.current) {
            // 1. Ensure last submission is recorded if running without prior submit
            if (lastSubmitRows) {
                try {
                    const score = lastSubmitRows.filter(r => r.status === 'Pass').length;
                    // Re-record submission to ensure the server has the latest score/report
                    await api.post('/submissions', { 
                        assessment_id: assessment.id, type: 'coding', 
                        payload: { code, language, report: lastSubmitRows }, 
                        score, 
                        started_at: startedAt.current ? new Date(startedAt.current).toISOString() : undefined, 
                        elapsed_seconds: startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : undefined, 
                        question_ids: questions.map(q => q.id) 
                    });
                } catch (e) {
                    console.error("Failed to record final submission on exit:", e);
                }
            }
            
            // 2. END the session here (CRITICAL STEP)
            try {
                await api.post(`/assessments/${assessment.id}/sessions/${sessionIdRef.current}/finish`);
            } catch(e) {
                console.error("Failed to finish session. Server likely failed the transaction.", e);
                // Even if finish fails, proceed to onBack to prevent client lock-up
            }
        }
        
        // 3. Exit the view
        onBack();
    }
    
    if (view === 'loading') {
        return <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /> <span className="ml-3 text-lg text-gray-700">Loading Environment...</span></div>
    }

    if (view === 'ineligible') {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="mb-4">
                    <button onClick={onBack} className="text-indigo-600 hover:text-indigo-700 font-medium">← Back to Assessments</button>
                    <h2 className="text-2xl font-bold text-gray-900 mt-2">{assessment.title}</h2>
                </div>
                <div className="bg-red-100 border border-red-400 text-red-700 p-6 rounded-lg flex items-center gap-3 shadow-md">
                    <XCircleIcon className="w-6 h-6 flex-shrink-0" />
                    <div className="font-semibold text-lg">Ineligible to start assessment</div>
                </div>
            </div>
        );
    }


    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            <Modal open={cModal.open} title={cModal.title} body={cModal.body} onClose={() => { cModal.onClose?.(); setCModal({ open: false, title: '', body: '' }); }} />
            <TestResultsModal 
                open={resultsModalOpen} 
                results={resultsModalData.results} 
                summary={resultsModalData.summary} 
                onClose={() => setResultsModalOpen(false)}
                isFinalSubmit={resultsModalData.isFinalSubmit}
            />

            {/* Sticky Header */}
            <header className="flex-shrink-0 z-40 bg-white shadow-md p-4 flex justify-between items-center border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleEndTest}
                        className="px-3 py-1.5 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition text-sm font-medium"
                    >
                        End Test
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 hidden sm:block">{assessment.title}</h1>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-700">
                    <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4 text-indigo-500" />
                        <span>Time Left: </span>
                        <span className={`font-bold ${timeLeft <= (assessment.duration_minutes * 60) * 0.1 ? 'text-red-600' : 'text-indigo-600'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Split Pane Area */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Problem Pane (Toggleable) */}
                <div className={`
                    ${isProblemPaneOpen ? 'w-full lg:w-1/2' : 'hidden lg:block lg:w-0'} 
                    p-4 md:p-6 overflow-y-auto space-y-6 
                    flex-shrink-0 transition-width duration-300
                    border-r border-gray-200 bg-gray-50
                `}>
                    
                    {/* Problem Description */}
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Problem: {selected?.title}</h3>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{(selected?.description) || 'No description'}</p>
                    </div>

                    {/* Sample Test Cases */}
                    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <h3 className="font-semibold text-gray-900 mb-3">Sample Tests</h3>
                        <div className="space-y-3 text-sm">
                            {tests.filter(t => !t.is_hidden).map((t, i) => (
                                <div key={t.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                                    <p className="font-medium text-gray-700 mb-1">Example {i + 1}</p>
                                    <p className="text-xs text-gray-600">Input: <code className="bg-white px-1 rounded border">{t.input}</code></p>
                                    <p className="text-xs text-gray-600">Expected Output: <code className="bg-white px-1 rounded border">{t.expected_output}</code></p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Code Editor and Console Area */}
                <div className={`
                    ${isProblemPaneOpen ? 'hidden lg:flex lg:w-1/2' : 'w-full flex'}
                    flex-col flex-grow 
                    bg-white 
                    overflow-y-hidden
                `}>
                    
                    {/* Code Editor Container */}
                    <div className="flex-1 relative flex flex-col min-h-0">
                        
                        {/* Editor Header/Language Selector */}
                        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <div className="font-semibold text-gray-900 text-sm">Code Editor</div>
                            <select value={language} onChange={(e) => setLanguage(e.target.value as any)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg transition bg-white">
                                {(assessment.allowed_languages || ['javascript', 'python', 'cpp', 'c', 'java', 'typescript']).map((l: string) => (
                                    <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Editor Area (Takes max space) */}
                        <div className="flex-1 min-h-[40vh] bg-white">
                            <AceCodeEditor 
                                value={code} 
                                onChange={setCode} 
                                onSave={() => localStorage.setItem(codeKey, code)} 
                                language={language}
                            />
                        </div>
                    </div>
                    
                    {/* Console/Actions (Buttons are ALWAYS visible) */}
                    <div className="flex-shrink-0 p-4 space-y-4 border-t border-gray-200 bg-white shadow-lg">
                        
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 justify-end">
                            
                            <button onClick={() => { localStorage.setItem(codeKey, code); }} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm text-gray-700 transition">
                                <RefreshCw className="w-4 h-4 inline mr-1" /> Save Draft
                            </button>
                            
                            {/* Run Code (Custom Input) */}
                            <button onClick={handleRunCode} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-md text-sm">
                                Run Code
                            </button>
                            
                            {/* Run Sample Tests */}
                            <button disabled={isRunning || timeLeft === 0} onClick={handleRunTests} className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition shadow-md text-sm">
                                {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Run Sample Tests'}
                            </button>
                            
                            {/* Submit Final Code */}
                            <button disabled={isRunning || timeLeft === 0} onClick={handleSubmitFinal} className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition shadow-md text-sm">
                                {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Project'}
                            </button>
                        </div>
                        
                        {/* Input/Output Console */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Input</label>
                                <textarea rows={4} value={stdin} onChange={(e) => setStdin(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 font-mono text-xs bg-gray-100" placeholder="Input for 'Run Code' button" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Output</label>
                                <pre className="w-full border border-gray-300 rounded-lg p-3 font-mono text-xs whitespace-pre-wrap bg-gray-100 h-[104px] overflow-auto">{stdout || 'No output after last run.'}</pre>
                            </div>
                        </div>
                        
                        {/* Mobile Problem/Editor Toggle */}
                        <button 
                            onClick={() => setIsProblemPaneOpen(p => !p)} 
                            className="lg:hidden w-full flex items-center justify-center p-2 mt-2 bg-gray-100 border border-gray-300 rounded-lg text-indigo-600 font-medium"
                        >
                            {isProblemPaneOpen ? 'Show Code Editor' : 'Show Problem Description'}
                            {isProblemPaneOpen ? <ChevronUp className='w-4 h-4 ml-2'/> : <ChevronDown className='w-4 h-4 ml-2'/>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}