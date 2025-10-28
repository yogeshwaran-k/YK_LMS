import { Users, BookOpen, FileText, TrendingUp } from 'lucide-react';

export default function SuperAdminDashboard() {
  const stats = [
    {
      name: 'Total Users',
      value: '0',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Total Courses',
      value: '0',
      icon: BookOpen,
      color: 'bg-green-500',
    },
    {
      name: 'Active Assessments',
      value: '0',
      icon: FileText,
      color: 'bg-yellow-500',
    },
    {
      name: 'Completion Rate',
      value: '0%',
      icon: TrendingUp,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Super Admin Dashboard</h1>

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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <p className="text-gray-500">No recent activity</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Storage</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
