import { useRef, useState } from 'react';
import { api } from '../../lib/api';

export default function MCQBulkUpload({ assessmentId, onDone }: { assessmentId: string; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setLoading(true);
    try {
      const text = await file.text();
      await api.post(`/assessments/${assessmentId}/mcq-questions/bulk`, { csv: text });
      onDone();
    } catch (err: any) {
      setError(err.message || 'Failed to upload');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function downloadTemplate() {
    const csv = 'question_text,option_a,option_b,option_c,option_d,correct_option,marks,difficulty,topic,explanation\n' +
      'What is 2+2?,1,2,3,4,d,1,easy,math,Simple addition\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mcq_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
      >
        {loading ? 'Uploading...' : 'Bulk upload CSV'}
      </button>
      <button onClick={downloadTemplate} className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">Download template</button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}