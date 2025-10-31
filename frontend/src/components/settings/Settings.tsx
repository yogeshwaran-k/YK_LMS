import { useEffect, useState } from 'react';

interface AppSettings {
  disable_copy_paste: boolean;
  tab_switch_limit: number | null;
  default_duration?: number;
  default_attempts?: number;
}

export default function Settings() {
  const [s, setS] = useState<AppSettings>({ disable_copy_paste: false, tab_switch_limit: null, default_duration: 60, default_attempts: 1 });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('app_settings');
      if (raw) setS(JSON.parse(raw));
    } catch {}
  }, []);

  function save() {
    localStorage.setItem('app_settings', JSON.stringify(s));
    alert('Settings saved');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={s.disable_copy_paste} onChange={(e)=>setS({ ...s, disable_copy_paste: e.target.checked })} />
            <span>Disable Copy/Paste for new assessments by default</span>
          </label>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Default Tab Switch Limit</label>
            <input type="number" min={0} value={s.tab_switch_limit ?? ''} onChange={(e)=> setS({ ...s, tab_switch_limit: e.target.value===''? null : (parseInt(e.target.value)||0) })} className="w-full border rounded px-2 py-1" placeholder="Leave empty for unlimited" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Default Duration (minutes)</label>
            <input type="number" min={1} value={s.default_duration||60} onChange={(e)=> setS({ ...s, default_duration: parseInt(e.target.value)||60 })} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Default Allowed Attempts</label>
            <input type="number" min={1} value={s.default_attempts||1} onChange={(e)=> setS({ ...s, default_attempts: parseInt(e.target.value)||1 })} className="w-full border rounded px-2 py-1" />
          </div>
        </div>
        <div className="text-right">
          <button onClick={save} className="px-3 py-1.5 border rounded">Save</button>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">These values are stored locally and used as defaults when creating new assessments.</p>
    </div>
  );
}
