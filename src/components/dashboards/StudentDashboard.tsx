import { BookOpen, FileText, Award, TrendingUp } from 'lucide-react';

export default function StudentDashboard() {
  const stats = [
    {
      name: 'Enrolled Courses',
      value: '0',
      icon: BookOpen,
      color: 'bg-blue-500',
    },
    {
      name: 'Pending Assessments',
      value: '0',
      icon: FileText,
      color: 'bg-yellow-500',
    },
    {
      name: 'Certificates Earned',
      value: '0',
      icon: Award,
      color: 'bg-green-500',
    },
    {
      name: 'Average Score',
      value: '0%',
      icon: TrendingUp,
      color: 'bg-indigo-500',
    },
  ];

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
          <p className="text-gray-500">No courses assigned yet</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <p className="text-gray-500">No recent activity</p>
        </div>
      </div>
    </div>
  );
}
