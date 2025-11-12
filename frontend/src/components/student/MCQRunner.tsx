// =====================================================================
// 📁 src/components/student/MCQRunner.tsx
// =====================================================================
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { api } from '../../lib/api';
import { ClockIcon, XCircleIcon, CheckCircleIcon, Loader2, Info } from 'lucide-react';
import { AssessmentBase, Modal, formatTime, AnalysisCard } from './StudentAssessmentView';

// Local/Specific Interfaces
interface Assessment extends AssessmentBase {
    show_results_immediately?: boolean;
    allowed_attempts?: number;
    duration_minutes: number;
    results_show?: 'mark' | 'mark_analysis';
}
interface MCQ { id: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: 'a'|'b'|'c'|'d'; marks: number }


export default function MCQRunner({ assessment, onBack, analysis }: { assessment: Assessment; onBack: () => void; analysis?: boolean }) {
    const [questions, setQuestions] = useState<MCQ[]>([]);
    const [answers, setAnswers] = useState<Record<string, 'a' | 'b' | 'c' | 'd' | undefined>>({});
    const [idx, setIdx] = useState(0);
    const [attempts, setAttempts] = useState(0);
    const [view, setView] = useState<'loading' | 'test' | 'result' | 'analysis' | 'ineligible'>(analysis ? 'loading' : 'loading');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const startedAt = useRef<number | null>(null);
    const [eligibilityMsg, setEligibilityMsg] = useState<string>('');
    const [disableCP, setDisableCP] = useState(false);
    const [tabLimit, setTabLimit] = useState<number | null>(null);
    const [tabUsed, setTabUsed] = useState(0);
    const [modal, setModal] = useState<{ open: boolean; title: string; body: string; onClose?: () => void }>({ open: false, title: '', body: '' });

    const totalMarks = useMemo(() => questions.reduce((s, q) => s + q.marks, 0), [questions]);
    const currentScore = useCallback(() => {
        let s = 0; for (const q of questions) if (answers[q.id] === q.correct_option) s += q.marks;
        return s;
    }, [questions, answers]);

    const autoSubmit = useCallback(async () => {
        try {
            const payload = { answers, autoTimeout: true };
            const s = currentScore();
            await api.post('/submissions', {
                assessment_id: assessment.id, type: 'mcq', score: s, payload,
                started_at: startedAt.current ? new Date(startedAt.current).toISOString() : undefined,
                elapsed_seconds: startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : undefined
            });
            if (sessionId) await api.post(`/assessments/${assessment.id}/sessions/${sessionId}/finish`);
        } catch { /* Graceful fallback if assessment missing */ } finally { setView('result'); }
    }, [answers, assessment.id, currentScore, sessionId]);

    const tryInitializeSession = useCallback(async (_isRecovery = false) => {
        const duration = assessment.duration_minutes || 60;
        
        const sor = await api.post<any>(`/assessments/${assessment.id}/start-or-resume`);
        const e = await api.get<any>(`/assessments/${assessment.id}/eligibility`);
        
        if (e?.proctor) {
            setDisableCP(!!e.proctor.disable_copy_paste);
            setTabLimit(e.proctor.tab_switch_limit ?? null);
            setTabUsed(e.proctor.tab_switch_used || 0);
        }

        const sessId = sor?.session_id || e.session_id;

        if (sessId) {
            setSessionId(sessId);
            const remaining = e.remaining_seconds ?? (duration * 60);
            setTimeLeft(remaining);
            startedAt.current = Date.now() - ((duration * 60) - remaining) * 1000;
            return true;
        }

        return false;
    }, [assessment.id, assessment.duration_minutes]);


    // Initial Load & Session Management (Uses Recovery Pattern)
    useEffect(() => {
        const loadAssessment = async () => {
            try {
                if (analysis) {
                    if (assessment.results_show !== 'mark_analysis') {
                        setView('ineligible'); 
                        setEligibilityMsg('Analysis view is not enabled by the instructor for this assessment.');
                        return;
                    }
                    
                    const qs = await api.get<MCQ[]>(`/assessments/${assessment.id}/mcq-questions`);
                    setQuestions(qs);
                    const m = await api.get<{ count: number }>(`/submissions/mine?assessment_id=${assessment.id}`);
                    setAttempts(m.count || 0);
                    const latest = await api.get<any>(`/submissions/mine/latest?assessment_id=${assessment.id}`);
                    const a = latest?.payload?.answers || {};
                    setAnswers(a);
                    setView('analysis');
                    return;
                }
                
                let sessionSuccess = false;
                
                try {
                    // Try direct initialization (clean start or resume)
                    sessionSuccess = await tryInitializeSession();
                } catch (initialError: any) {
                    console.warn("Initial session attempt failed (likely 409). Attempting recovery...");
                    sessionSuccess = await tryInitializeSession(true); 
                }

                if (!sessionSuccess) {
                    // Final fallback if recovery also fails
                    const e = await api.get<any>(`/assessments/${assessment.id}/eligibility`);
                    const reasons: string[] = Array.isArray(e?.reasons) ? e.reasons : [];
                    const map: Record<string, string> = {
                        '409 Conflict': 'Active session exists. Failed to resume.',
                        'active_session_exists': 'Active session exists. Failed to resume.',
                        before_start: 'The test starts later.', after_end: 'The test has ended.',
                        attempts_exhausted: 'Attempts Exhausted.',
                    };
                    setEligibilityMsg(reasons.map((r: string) => map[r] || r).join(' | ') || 'Not eligible to start.');
                    setView('ineligible');
                    return;
                }
                
                const qs = await api.get<MCQ[]>(`/assessments/${assessment.id}/mcq-questions`);
                setQuestions(qs);
                const m = await api.get<{ count: number }>(`/submissions/mine?assessment_id=${assessment.id}`);
                setAttempts(m.count || 0);
                setView('test');

            } catch (err: any) {
                const reasons = err?.reasons || [err?.message];
                const map: Record<string, string> = {
                    '409 Conflict': 'Active session exists. Please try refreshing or resuming.',
                    'Failed to fetch': 'Network error. Please check your connection.',
                };
                setEligibilityMsg(reasons.map((r: string) => map[r] || r).join(' | ') || 'Not eligible to start.');
                setView('ineligible');
            }
        };
        loadAssessment();
    }, [assessment.id, assessment.duration_minutes, analysis, assessment.results_show, tryInitializeSession]);
    
    // Timer Effect
    useEffect(() => {
        if (timeLeft <= 0 || view !== 'test') return;
        const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
        return () => clearInterval(t);
    }, [timeLeft, view]);

    // Auto-Submit Effect
    useEffect(() => {
        if (sessionId && timeLeft === 0 && view === 'test') {
            setModal({
                open: true, title: 'Time Expired', body: 'The timer has reached zero. Your answers will be submitted automatically.',
                onClose: () => { setModal(m => ({ ...m, open: false })); void autoSubmit(); }
            });
        }
    }, [timeLeft, sessionId, view, autoSubmit]);

    // Proctoring Hooks
    const recordTabSwitch = useCallback(async () => {
        try {
            if (!sessionId) return;
            const r = await api.post<{ used: number; limit: number | null; exceeded: boolean }>(`/assessments/${assessment.id}/sessions/${sessionId}/proctor/tab-switch`);
            setTabUsed(r.used || (tabUsed + 1));
            const lim = r.limit ?? tabLimit;
            const remaining = lim === null ? null : Math.max(0, (lim as number) - (r.used || 0));
            setModal({
                open: true, title: 'Tab Switch Detected',
                body: lim === null ? 'Tab switches are being monitored.' : `Remaining switches: ${remaining}`,
                onClose: () => setModal(m => ({ ...m, open: false }))
            });
            if (r.exceeded) {
                setModal({
                    open: true, title: 'Session Paused',
                    body: 'Tab switch limit exceeded. Your attempt is paused. Please contact support.',
                    onClose: () => { setModal({ open: false, title: '', body: '' }); onBack(); }
                });
            }
        } catch { }
    }, [sessionId, tabLimit, tabUsed, assessment.id, onBack]);

    useEffect(() => {
        if (!sessionId || view !== 'test') return;

        const onVis = async () => { if (document.hidden) await recordTabSwitch(); };
        const onBlur = async () => { await recordTabSwitch(); };
        const prevent = (e: Event) => { if (disableCP) { e.preventDefault(); e.stopPropagation(); return false; } };
        const preventKey = (e: KeyboardEvent) => {
            if (!disableCP) return;
            if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopPropagation(); }
        };

        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('blur', onBlur);
        document.addEventListener('copy', prevent as any);
        document.addEventListener('cut', prevent as any);
        document.addEventListener('paste', prevent as any);
        document.addEventListener('contextmenu', prevent as any);
        document.addEventListener('keydown', preventKey as any);

        return () => {
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('copy', prevent as any);
            document.removeEventListener('cut', prevent as any);
            document.removeEventListener('paste', prevent as any);
            document.removeEventListener('contextmenu', prevent as any);
            document.removeEventListener('keydown', preventKey as any);
        };
    }, [sessionId, view, disableCP, recordTabSwitch]);


    const handleExit = async () => {
        const confirmed = window.confirm("Are you sure you want to end your test session?");
        if (!confirmed) return;
        if (sessionId) {
            try {
                const s = currentScore();
                await api.post('/submissions', {
                    assessment_id: assessment.id, type: 'mcq', score: s, payload: { answers },
                    started_at: startedAt.current ? new Date(startedAt.current).toISOString() : undefined,
                    elapsed_seconds: startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : undefined
                });
                await api.post(`/assessments/${assessment.id}/sessions/${sessionId}/finish`);
            } catch (error) {
                console.error("Submission on exit failed:", error);
            }
        }
        onBack();
    };


    if (view === 'loading') {
        return <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /> <span className="ml-3 text-lg text-gray-700">Loading Assessment...</span></div>
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
                    <div>
                        <div className="font-semibold text-lg mb-1">Access Denied</div>
                        <p className="text-sm">{eligibilityMsg}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'result') {
        const finalScore = currentScore();
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="mb-6">
                    <button onClick={onBack} className="text-indigo-600 hover:text-indigo-700 font-medium">← Home</button>
                    <h2 className="text-2xl font-bold text-gray-900 mt-2">{assessment.title} - Submission Complete</h2>
                </div>
                {assessment.show_results_immediately ? (
                    <div className="bg-white rounded-xl shadow-lg p-8 border border-green-200">
                        <CheckCircleIcon className="w-10 h-10 text-green-600 mx-auto mb-4" />
                        <div className="text-center">
                            <div className="text-3xl font-extrabold text-gray-900 mb-2">Score: {finalScore} / {totalMarks}</div>
                            <p className="text-gray-600 mb-6">Your results are available immediately.</p>
                            {assessment.results_show === 'mark_analysis' && (
                                <button onClick={() => setView('analysis')} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-md">View Analysis</button>
                            )}
                            
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                        <ClockIcon className="w-10 h-10 text-amber-600 mx-auto mb-4" />
                        <div className="text-center">
                            <div className="text-xl font-semibold text-gray-900 mb-2">Thank you for your submission.</div>
                            <p className="text-gray-600">Results will be released later as configured by the instructor.</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'analysis') {
        const total = questions.length;
        const correct = questions.filter(q => answers[q.id] === q.correct_option).length;
        const answered = Object.values(answers).filter(a => a !== undefined).length;
        const wrong = answered - correct;
        const unanswered = total - answered;

        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="mb-6 flex justify-between items-center border-b pb-4">
                    <div>
                        <button onClick={onBack} className="text-indigo-600 hover:text-indigo-700 font-medium">← Home</button>
                        <h2 className="text-3xl font-bold text-gray-900 mt-2">{assessment.title} - Submission Analysis</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <AnalysisCard title="Total Questions" value={total} color="bg-indigo-100 text-indigo-800" />
                    <AnalysisCard title="Correct Answers" value={correct} color="bg-green-100 text-green-800" />
                    <AnalysisCard title="Wrong Answers" value={wrong} color="bg-red-100 text-red-800" />
                    <AnalysisCard title="Unanswered" value={unanswered} color="bg-gray-100 text-gray-800" />
                </div>

                <div className="space-y-6">
                    {questions.map((q, i) => {
                        const isCorrect = answers[q.id] === q.correct_option;
                        const userAnswer = answers[q.id];
                        const statusColor = isCorrect ? 'border-green-400 bg-green-50' : userAnswer ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white';
                        const statusText = isCorrect ? 'Correct' : userAnswer ? 'Wrong' : 'Unanswered';

                        return (
                            <div key={q.id} className={`rounded-xl shadow-md p-5 border-l-4 ${statusColor}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="font-semibold text-lg text-gray-900">Q{i + 1}. {q.question_text}</div>
                                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                        {statusText}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="text-gray-700">
                                        <span className="font-medium">Your Answer:</span> <span className={`${isCorrect ? 'text-green-700' : 'text-red-700'}`}>{userAnswer ? (userAnswer as string).toUpperCase() : 'N/A'}</span>
                                    </div>
                                    <div className="text-gray-700">
                                        <span className="font-medium">Correct Answer:</span> <span className="text-blue-700">{q.correct_option.toUpperCase()} ({q[`option_${q.correct_option}` as const]})</span>
                                    </div>
                                    <div className="text-gray-700">
                                        <span className="font-medium">Marks:</span> {q.marks}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    const q = questions[idx];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Modal open={modal.open} title={modal.title} body={modal.body} onClose={() => { modal.onClose?.(); setModal({ open: false, title: '', body: '' }); }} />

            {/* Sticky Header/Timer/Proctoring */}
            <header className="sticky top-0 z-40 bg-white shadow-md p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={handleExit} className="px-3 py-1.5 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition">
                        End Test
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">{assessment.title}</h1>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-700">
                    <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4 text-indigo-500" />
                        <span>Time Left: </span>
                        <span className={`font-bold ${timeLeft <= (assessment.duration_minutes * 60) * 0.1 ? 'text-red-600' : 'text-indigo-600'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                    <span>Attempt: <span className="font-semibold">{attempts + 1} / {assessment.allowed_attempts || '∞'}</span></span>
                    {tabLimit !== null && (
                        <div className={`flex items-center gap-1 ${tabUsed > tabLimit ? 'text-red-600 font-bold' : ''}`}>
                            <Info className="w-4 h-4" />
                            <span>Tab Switches: {Math.min(tabUsed, (tabLimit || 0) + 1)} / {tabLimit}</span>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Question Navigation Sidebar */}
                <div className="w-64 p-4 bg-gray-100 border-r overflow-y-auto hidden md:block">
                    <h3 className="font-semibold text-gray-800 mb-3">Question Navigator</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {questions.map((q, qIndex) => (
                            <button
                                key={q.id}
                                onClick={() => setIdx(qIndex)}
                                className={`h-8 w-8 text-xs font-medium rounded-md flex items-center justify-center transition-colors
                                    ${qIndex === idx ? 'bg-indigo-600 text-white shadow-lg' :
                                    answers[q.id] ? 'bg-green-200 text-green-800 hover:bg-green-300' :
                                        'bg-white text-gray-700 border border-gray-300 hover:bg-gray-200'
                                    }`}
                                title={answers[q.id] ? 'Answered' : 'Unanswered'}
                            >
                                {qIndex + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {questions.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No questions loaded for this assessment.</div>
                    ) : (
                        <>
                            {/* Question Card */}
                            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
                                <div className="text-lg font-bold text-gray-900 mb-4 border-b pb-3">
                                    Question {idx + 1} of {questions.length} <span className="text-sm text-gray-500 ml-2">({q.marks} Marks)</span>
                                </div>
                                <p className="text-gray-800 mb-6 whitespace-pre-wrap">{q.question_text}</p>

                                {/* Options */}
                                <div className="space-y-4">
                                    {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                                        <label
                                            key={opt}
                                            className={`block p-4 border rounded-xl cursor-pointer transition-all duration-200
                                                ${answers[q.id] === opt ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500' : 'border-gray-300 hover:bg-gray-50'}`
                                            }
                                        >
                                            <input
                                                type="radio"
                                                name={q.id}
                                                checked={answers[q.id] === opt}
                                                onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-3"
                                            />
                                            <span className="font-medium text-gray-800">{opt.toUpperCase()}. {q[`option_${opt}` as const]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Navigation and Submit Footer */}
                            <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-xl shadow-lg gap-3">
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                                    <button
                                        disabled={idx === 0}
                                        onClick={() => setIdx(i => Math.max(0, i - 1))}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition flex-1"
                                    >
                                        ← Previous
                                    </button>
                                    <button
                                        disabled={idx >= questions.length - 1}
                                        onClick={() => setIdx(i => Math.min(questions.length - 1, i + 1))}
                                        className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg disabled:opacity-50 hover:bg-indigo-50 transition flex-1"
                                    >
                                        Next →
                                    </button>
                                </div>

                                <button
                                    disabled={timeLeft === 0}
                                    onClick={() => setModal({
                                        open: true, title: 'Confirm Submission',
                                        body: `You are about to submit the test. You have answered ${Object.values(answers).filter(a => a !== undefined).length} out of ${questions.length} questions. Are you sure?`,
                                        onClose: async () => {
                                            await autoSubmit();
                                        }
                                    })}
                                    className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-md transition"
                                >
                                    Submit Test
                                </button>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}