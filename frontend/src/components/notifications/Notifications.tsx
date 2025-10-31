import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface User { id: string; full_name: string; email: string }
interface Notification { id: string; title: string; body: string; created_at: string }

export default function Notifications() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [target, setTarget] = useState<'user'|'course'|'assessment'|'group'>('user');
  const [targetId, setTargetId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [list, setList] = useState<Notification[]>([]);

  useEffect(() => { (async () => { try { setUsers(await api.get<User[]>('/users')); setCourses(await api.get<any[]>('/courses')); setGroups(await api.get<any[]>('/groups')); } catch {} })(); }, []);
  useEffect(() => { (async () => { if (target==='user' && targetId) { try { const me = await api.get<Notification[]>(`/notifications?user_id=${targetId}` as any).catch(()=>[] as Notification[]); setList(me); } catch { setList([]); } } else { setList([]); } })(); }, [target, targetId]);

  async function send() {
    if (!targetId || !title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const payload: any = { title, body };
      if (target==='user') payload.user_id = targetId;
      if (target==='course') payload.course_id = targetId;
      if (target==='assessment') payload.assessment_id = targetId;
      if (target==='group') payload.group_id = targetId;
      await api.post('/notifications', payload);
      setTitle(''); setBody('');
      if (target==='user') {
        const list = await api.get<Notification[]>(`/notifications?user_id=${targetId}` as any).catch(()=>[] as Notification[]);
        setList(list);
      }
      alert('Notification sent');
    } catch (e: any) {
      alert(e?.message || 'Failed to send');
    } finally { setSending(false); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Notifications</h1>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Target</label>
            <select value={target} onChange={(e)=>{ setTarget(e.target.value as any); setTargetId(''); setList([]); }} className="w-full border rounded px-2 py-1">
              <option value="user">User</option>
              <option value="course">Course</option>
              <option value="assessment">Assessment</option>
              <option value="group">Group</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Select</label>
            {target==='user' && (
              <select value={targetId} onChange={(e)=>setTargetId(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="">-- Choose user --</option>
                {users.map(u => (<option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>))}
              </select>
            )}
            {target==='course' && (
              <select value={targetId} onChange={(e)=>setTargetId(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="">-- Choose course --</option>
                {courses.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}
              </select>
            )}
            {target==='group' && (
              <select value={targetId} onChange={(e)=>setTargetId(e.target.value)} className="w-full border rounded px-2 py-1">
                <option value="">-- Choose group --</option>
                {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
              </select>
            )}
            {target==='assessment' && (
              <input value={targetId} onChange={(e)=>setTargetId(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="Enter Assessment ID" />
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Title</label>
            <input value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Message</label>
            <input value={body} onChange={(e)=>setBody(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
        </div>
        <div className="mt-3 text-right">
          <button disabled={!targetId || !title || !body || sending} onClick={send} className="px-3 py-1.5 border rounded disabled:opacity-50">Send</button>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b font-semibold">Recent Notifications {target==='user' && targetId ? 'for selected user' : ''}</div>
        <div className="p-4 space-y-3">
          {list.map(n => (
            <div key={n.id} className="border rounded p-3">
              <div className="font-medium text-gray-900">{n.title}</div>
              <div className="text-sm text-gray-700">{n.body}</div>
              <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
          {list.length===0 && <div className="text-sm text-gray-500">No notifications</div>}
        </div>
      </div>
    </div>
  );
}
