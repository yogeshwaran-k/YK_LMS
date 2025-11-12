import MCQRunner from './MCQRunner';
import CodingRunner from './CodingRunner';
import AssignmentView from './AssignmentView';
import { XCircleIcon, } from 'lucide-react';

// --- Shared Interfaces ---
export interface AssessmentBase { 
    id: string; 
    title: string; 
    type: 'mcq' | 'coding' | 'assignment'; 
    description?: string;
    duration_minutes: number;
    allowed_languages?: string[];
    show_results_immediately?: boolean;
    allowed_attempts?: number;
    results_show?: 'mark' | 'mark_analysis';
}
export interface ResultRow { 
    idx: number; 
    status: 'Pass' | 'Fail' | 'Error'; 
    expected: string; 
    actual: string; 
    kind: 'sample' | 'hidden'; 
    time_ms?: number;
}
// --- Utility Functions ---

export const formatTime = (total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const AnalysisCard = ({ title, value, color }: { title: string; value: number; color: string }) => (
    <div className={`rounded-xl p-5 shadow-sm border ${color.replace('bg-', 'border-')}`}>
        <div className={`text-xs font-medium uppercase mb-1 ${color}`}>{title}</div>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
);

// --- Shared Components ---

export const Modal = ({ open, title, body, onClose }: { open: boolean; title: string; body: string; onClose?: () => void }) => {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="px-5 py-4 border-b font-semibold text-gray-900 flex items-center justify-between">
                    <span>{title}</span>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 text-sm text-gray-700 whitespace-pre-wrap">{body}</div>
                <div className="px-5 py-3 border-t text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">OK</button>
                </div>
            </div>
        </div>
    );
};

export const TestResultsModal = ({ 
    open, 
    results, 
    summary, 
    onClose,
    isFinalSubmit,
}: { 
    open: boolean; 
    results: ResultRow[]; 
    summary: { passed: number; total: number; score?: number };
    onClose: () => void;
    isFinalSubmit: boolean;
}) => {
    if (!open) return null;

    const summaryText = isFinalSubmit 
        ? `Final Score: ${summary.score !== undefined ? summary.score : summary.passed} / ${summary.total}`
        : `Run Results: Passed ${summary.passed} / ${summary.total} tests`;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
                <div className="flex-shrink-0 px-6 py-4 border-b font-bold text-lg text-gray-900 flex items-center justify-between">
                    <span>Test Evaluation Details</span>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-shrink-0 px-6 py-3 bg-gray-50 border-b">
                    <div className="font-semibold text-indigo-600">{summaryText}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        {isFinalSubmit ? 'Results include all visible and hidden test cases.' : 'Results only include visible sample test cases.'}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr className="text-left text-gray-500 uppercase tracking-wider">
                                <th className="py-3 px-4">S. No</th>
                                <th className="py-3 px-4">Type</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Time (ms)</th>
                                <th className="py-3 px-4">Expected</th>
                                <th className="py-3 px-4">Actual Output</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {results.map((r, i) => (
                                <tr key={i} className={r.kind === 'hidden' && !isFinalSubmit ? 'text-gray-400 bg-gray-50' : ''}>
                                    <td className="py-3 px-4">{i + 1}</td>
                                    <td className="py-3 px-4 capitalize">{r.kind}</td>
                                    <td className={`py-3 px-4 font-semibold ${r.status === 'Pass' ? 'text-green-600' : r.status === 'Error' ? 'text-orange-500' : 'text-red-600'}`}>
                                        {r.status}
                                    </td>
                                    <td className="py-3 px-4">{r.time_ms || 'N/A'}</td>
                                    <td className="py-3 px-4 whitespace-pre-wrap font-mono text-xs">{r.expected}</td>
                                    <td className="py-3 px-4 whitespace-pre-wrap font-mono text-xs">{r.actual}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {results.length === 0 && <div className="text-center py-8 text-gray-500">No test results to display.</div>}
                </div>

                <div className="flex-shrink-0 px-6 py-4 border-t text-right bg-white">
                    <button onClick={onClose} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Close</button>
                </div>
            </div>
        </div>
    );
};


// --- Main Router Component ---

export default function StudentAssessmentView({ assessment, onBack, analysis }: { assessment: AssessmentBase & any; onBack: () => void; analysis?: boolean }) {
    
    // We pass the full assessment object down, as the specific runners know their required fields.
    if (assessment.type === 'mcq') {
        return <MCQRunner assessment={assessment} onBack={onBack} analysis={analysis} />;
    }
    if (assessment.type === 'coding') {
        return <CodingRunner assessment={assessment} onBack={onBack} />;
    }
    if (assessment.type === 'assignment') {
        return <AssignmentView assessment={assessment} onBack={onBack} />;
    }

    return <div className="p-6 text-red-500">Error: Unknown assessment type.</div>;
}