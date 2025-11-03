import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { BookOpen, FileText, TrendingUp, ChevronRight } from 'lucide-react';

interface Course { id: string; title: string; description: string; category: string; }

import StudentCourseView from '../student/StudentCourseView';

function StudentNotifications() {
  const [items, setItems] = useState<Array<{ id: string; title: string; body: string; created_at: string }>>([]);
  useEffect(()=>{ (async()=>{ try { setItems(await api.get<any[]>('/notifications')); } catch {} })(); }, []);
  if (items.length===0) return <div className="text-gray-500">No notifications</div>;
  return (
    <div className="space-y-3">
      {items.map(n => (
        <div key={n.id} className="border rounded p-3">
          <div className="font-medium text-gray-900">{n.title}</div>
          <div className="text-sm text-gray-700">{n.body}</div>
          <div className="text-xs text-gray-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

export default function StudentDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  useEffect(() => { (async () => {
    const cs = await api.get<Course[]>('/me/courses').catch(()=>[] as Course[]);
    setCourses(cs);
    for (const c of cs) {
      try {
        const mods = await api.get<any[]>(`/courses/${c.id}/modules`);
        let lessons: any[] = [];
        for (const m of mods) {
          const ls = await api.get<any[]>(`/courses/${c.id}/modules/${m.id}/lessons`);
          lessons = lessons.concat(ls);
        }
        let done = 0;
        for (const l of lessons) {
          const p = await api.get<any>(`/progress/lessons/${l.id}`).catch(()=>({ total_seconds: 0 }));
          const need = Math.max(0, (l.min_time_minutes||0)*60);
          if ((p?.total_seconds||0) >= need && need > 0) done++;
        }
        const pct = lessons.length ? Math.round((done/lessons.length)*100) : 0;
        setProgress(prev => ({ ...prev, [c.id]: pct }));
      } catch {}
    }
  })(); }, []);

  const [stats, setStats] = useState([
    { name: 'Enrolled Courses', value: '0', icon: BookOpen, color: 'bg-blue-500' },
    { name: 'Pending Assessments', value: '0', icon: FileText, color: 'bg-yellow-500' },
    { name: 'Average Score', value: '0%', icon: TrendingUp, color: 'bg-indigo-500' },
  ] as Array<{ name: string; value: string; icon: any; color: string }>);

  useEffect(()=>{ (async()=>{
    try {
      // enrolled courses
      setStats(s=> s.map(it => it.name==='Enrolled Courses' ? { ...it, value: String(courses.length) } : it));
      // pending assessments and average score
      let pending = 0; let totalScores = 0; let scoreCount = 0;
      for (const c of courses) {
        const mods = await api.get<any[]>(`/courses/${c.id}/modules`).catch(()=>[] as any[]);
        for (const m of mods) {
          const as = await api.get<any[]>(`/assessments/modules/${m.id}`).catch(()=>[] as any[]);
          for (const a of as) {
            const e = await api.get<any>(`/assessments/${a.id}/eligibility`).catch(()=>null);
            if (e?.can_start || e?.can_resume) pending++;
            const mine = await api.get<{ count:number; latest?: { score: number|null } }>(`/submissions/mine?assessment_id=${a.id}`).catch(()=>({ count:0, latest:null } as any));
            if (mine?.latest?.score != null) { totalScores += Number(mine.latest.score); scoreCount++; }
          }
        }
      }
      setStats(s => s.map(it => it.name==='Pending Assessments' ? { ...it, value: String(pending) } : it.name==='Average Score' ? { ...it, value: (scoreCount? Math.round((totalScores/scoreCount)) : 0) + '%' } : it));
    } catch {}
  })(); }, [courses.length]);

  if (selected) {
    return <StudentCourseView course={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Courses</h2>
          {courses.length === 0 ? (
            <p className="text-gray-500">No courses assigned yet</p>
          ) : (
            <div className="space-y-3">
              {courses.map(c => (
                <div key={c.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{c.title}</div>
                      <div className="text-xs text-gray-500">{c.category}</div>
                    </div>
                    <button onClick={() => setSelected(c)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      Open <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded">
                    <div className="h-2 bg-green-500 rounded" style={{ width: `${progress[c.id]||0}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Progress: {progress[c.id]||0}%</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
          <StudentNotifications />
        </div>
      </div>
    </div>
  );
}
