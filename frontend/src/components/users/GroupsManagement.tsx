import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface Group { id: string; name: string; description?: string }
interface User { id: string; full_name: string; email: string; role: string; is_active: boolean }

export default function GroupsManagement() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<Group|null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(()=>{ refresh(); (async()=> setUsers((await api.get<User[]>('/users')).filter(u=>u.role==='student' && u.is_active)))(); }, []);
  async function refresh(){ setGroups(await api.get<Group[]>('/groups')); }
  async function open(g: Group){ setSelected(g); setName(g.name); setDesc(g.description||''); setMembers(await api.get<string[]>(`/groups/${g.id}/members`)); }
  async function create(){ await api.post('/groups', { name, description: desc }); setName(''); setDesc(''); refresh(); }
  async function save(){ if (!selected) return; await api.put(`/groups/${selected.id}`, { name, description: desc }); refresh(); }
  async function addMembers(){ if (!selected) return; const ids = users.filter(u=>members.includes(u.id)).map(u=>u.id); await api.post(`/groups/${selected.id}/members`, { user_ids: ids }); refresh(); }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Learner Groups</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded p-4 border">
          <div className="font-semibold mb-2">Groups</div>
          <div className="space-y-2 max-h-80 overflow-auto">
            {groups.map(g => (
              <button key={g.id} onClick={()=>open(g)} className={`w-full text-left px-2 py-1 rounded ${selected?.id===g.id?'bg-blue-50 text-blue-700':'hover:bg-gray-50'}`}>{g.name}</button>
            ))}
            {groups.length===0 && <div className="text-sm text-gray-500">No groups</div>}
          </div>
          <div className="mt-4 space-y-2">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Group name" className="w-full border rounded px-2 py-1" />
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description" className="w-full border rounded px-2 py-1" />
            <button onClick={create} className="px-3 py-1.5 bg-blue-600 text-white rounded">Create</button>
          </div>
        </div>
        <div className="bg-white rounded p-4 border lg:col-span-2">
          {!selected ? (
            <div className="text-gray-500">Select a group to manage members</div>
          ) : (
            <div>
              <div className="font-semibold mb-2">Manage Members - {selected.name}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">All Students</div>
                  <div className="border rounded p-2 max-h-80 overflow-auto space-y-1">
                    {users.map(u => (
                      <label key={u.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={members.includes(u.id)} onChange={(e)=> setMembers(prev=> e.target.checked ? [...prev, u.id] : prev.filter(x=>x!==u.id))} />
                        <span>{u.full_name}</span>
                        <span className="text-gray-500">({u.email})</span>
                      </label>
                    ))}
                    {users.length===0 && <div className="text-gray-500 text-sm">No students</div>}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Actions</div>
                  <div className="space-x-2">
                    <button onClick={save} className="px-3 py-1.5 border rounded">Save Group</button>
                    <button onClick={addMembers} className="px-3 py-1.5 bg-blue-600 text-white rounded">Save Members</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}