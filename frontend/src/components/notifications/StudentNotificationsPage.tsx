import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function StudentNotificationsPage() {
  const [items, setItems] = useState<Array<{ id: string; title: string; body: string; created_at: string; read_at?: string|null }>>([]);
  const [loading, setLoading] = useState(true);

  async function load(){
    setLoading(true);
    try {
      const list = await api.get<any[]>('/notifications');
      setItems(list);
      const unread = list.filter(x=>!x.read_at).length;
      window.dispatchEvent(new CustomEvent('notify:unread', { detail: unread }));
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, []);

  async function markRead(id: string){ await api.patch(`/notifications/${id}/read`, {}); load(); }
  async function del(id: string){ await api.delete(`/notifications/${id}`); load(); }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Notifications</h1>
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b font-semibold flex items-center justify-between">
          <div>Inbox</div>
          <button onClick={load} className="px-3 py-1.5 border rounded">Refresh</button>
        </div>
        <div className="p-4 space-y-3">
          {loading && <div className="text-gray-500">Loading...</div>}
          {!loading && items.length===0 && <div className="text-gray-500">No notifications</div>}
          {items.map(n => (
            <div key={n.id} className={`border rounded p-3 ${!n.read_at ? 'bg-yellow-50 border-yellow-200' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-gray-900">{n.title}</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{n.body}</div>
                  <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                <div className="text-sm space-x-2">
                  {!n.read_at && <button onClick={()=>markRead(n.id)} className="px-2 py-1 border rounded">Mark Read</button>}
                  <button onClick={()=>del(n.id)} className="px-2 py-1 border rounded">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
