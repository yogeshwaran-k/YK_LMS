// =====================================================================
// 📁 src/components/student/AssignmentView.tsx
// =====================================================================
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ClockIcon, Info, Loader2, PlayCircleIcon } from 'lucide-react';
import { AssessmentBase } from './StudentAssessmentView';

// Local/Specific Interfaces
interface Assessment extends AssessmentBase { }
interface Assignment { id: string; title: string; description: string; max_file_size_mb: number; allowed_file_types: string[]; deadline: string | null }


export default function AssignmentView({ assessment, onBack }: { assessment: Assessment; onBack: () => void }) {
    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [note, setNote] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    useEffect(() => { (async () => { const a = await api.get<Assignment | null>(`/assessments/${assessment.id}/assignment`); setAssignment(a); })(); }, [assessment.id]);

    const handleSubmit = async () => {
        if (!assignment || isSubmitting) return;
        setIsSubmitting(true);
        setMessage(null);

        try {
            let filePayload: any = null;
            if (file) {
                if (file.size > assignment.max_file_size_mb * 1024 * 1024) {
                    throw new Error(`File size exceeds maximum limit of ${assignment.max_file_size_mb} MB.`);
                }
                const fileExt = file.name.split('.').pop()?.toLowerCase();
                if (!fileExt || !assignment.allowed_file_types.includes(fileExt)) {
                    throw new Error(`File type not allowed. Allowed types: ${assignment.allowed_file_types.join(', ')}.`);
                }

                const buf = await file.arrayBuffer();
                filePayload = { name: file.name, type: file.type, size: file.size, base64: btoa(String.fromCharCode(...new Uint8Array(buf))) };
            }

            await api.post('/submissions', { assessment_id: assessment.id, type: 'assignment', payload: { note, file: filePayload } });
            setMessage({ type: 'success', text: 'Assignment submitted successfully! Note: Grade will be released after manual review.' });
        } catch (error: any) {
            setMessage({ type: 'error', text: `Submission failed: ${error.message || 'Unknown error.'}` });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
            <div className="mb-6 border-b pb-4">
                <button onClick={onBack} className="text-indigo-600 hover:text-indigo-700 font-medium">← Back to Assessments</button>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{assessment.title} - Assignment</h2>
            </div>

            {!assignment ? (
                <div className="text-gray-500 text-center py-10">No assignment configured.</div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 space-y-6">
                    <div className="border-b pb-4">
                        <div className="text-xl font-bold text-gray-900 mb-2">{assignment.title}</div>
                        <div className="text-gray-700 whitespace-pre-wrap text-sm">{assignment.description}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        {assignment.deadline && <div className="flex items-center gap-2"><ClockIcon className='w-4 h-4' /> <strong>Deadline:</strong> {new Date(assignment.deadline).toLocaleString()}</div>}
                        <div className="flex items-center gap-2"><Info className='w-4 h-4' /> <strong>Max size:</strong> {assignment.max_file_size_mb} MB</div>
                        <div className="col-span-1 md:col-span-2 flex items-center gap-2"><PlayCircleIcon className='w-4 h-4' /> <strong>Allowed types:</strong> {assignment.allowed_file_types.join(', ')}</div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="pt-4 space-y-4 border-t">
                        <label className="block space-y-2">
                            <span className="text-sm font-medium text-gray-700">Submission Note (optional)</span>
                            <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Add any notes for the instructor..." />
                        </label>

                        <label className="block space-y-2">
                            <span className="text-sm font-medium text-gray-700">Upload File</span>
                            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        </label>

                        <div>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> : 'Submit Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}