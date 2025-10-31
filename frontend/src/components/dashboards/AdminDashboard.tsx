import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { BookOpen, Users, FileText, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState([
    { name: 'Courses', value: '0', icon: BookOpen, color: 'bg-blue-500' },
    { name: 'Active Students', value: '0', icon: Users, color: 'bg-green-500' },
    { name: 'Submissions (24h)', value: '0', icon: FileText, color: 'bg-yellow-500' },
    { name: 'Graded Today', value: '0', icon: CheckCircle, color: 'bg-indigo-500' },
  ] as Array<{ name: string; value: string; icon: any; color: string }>);

  useEffect(() => { (async () => {
    try {
      const [courses, users, submissions] = await Promise.all([
        api.get<any[]>('/courses'),
        api.get<any[]>('/users'),
        api.get<any[]>('/submissions')
      ]);
      const activeStudents = users.filter((u:any)=> u.role==='student' && u.is_active!==false).length;
      const since = Date.now() - 24*3600*1000;
      const last24 = submissions.filter((s:any)=> new Date(s.created_at).getTime() >= since).length;
      setStats(s => s.map(item => item.name==='Courses' ? { ...item, value: String(courses.length) } : item.name==='Active Students' ? { ...item, value: String(activeStudents) } : item.name==='Submissions (24h)' ? { ...item, value: String(last24) } : item));
    } catch {}
  })(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Courses</h2>
          <p className="text-gray-500">No courses created yet</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Performance</h2>
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    </div>
  );
}
