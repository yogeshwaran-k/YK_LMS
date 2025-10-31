import { useState } from 'react';
import { api } from '../../lib/api';

export default function BulkUploadMCQ({ bankId, onDone }: { bankId: string; onDone: () => Promise<void> | void }) {
  const [csv, setCsv] = useState('question_text,option_a,option_b,option_c,option_d,correct_option,marks\n');
  const [loading, setLoading] = useState(false);
  const disabled = !bankId || !csv.trim();

  async function upload() {
    setLoading(true);
    try {
      await api.post(`/mcq-banks/${bankId}/questions/bulk`, { csv });
      await onDone();
      setCsv('question_text,option_a,option_b,option_c,option_d,correct_option,marks\n');
      alert('Uploaded');
    } catch (e: any) {
      alert(e?.message || 'Upload failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={upload} disabled={disabled||loading} className="px-3 py-1.5 border rounded disabled:opacity-50">Bulk Upload</button>
      <details className="relative">
        <summary className="cursor-pointer select-none text-xs text-gray-600">Paste CSV</summary>
        <div className="absolute right-0 mt-1 bg-white border rounded shadow p-2 w-[360px] z-10">
          <textarea rows={6} value={csv} onChange={(e)=>setCsv(e.target.value)} className="w-full border rounded p-1 text-xs font-mono" />
          <div className="text-right mt-1">
            <button onClick={upload} disabled={disabled||loading} className="px-2 py-1 border rounded text-xs disabled:opacity-50">Upload</button>
          </div>
        </div>
      </details>
    </div>
  );
}
