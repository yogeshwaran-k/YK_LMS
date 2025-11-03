import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  FileText,
  Bell,
  CheckCircle,
  Code
} from 'lucide-react';
import { Route } from './Router';

interface LayoutProps {
  children: ReactNode;
  currentRoute: Route;
  onNavigate: (route: Route) => void;
}

export default function Layout({ children, currentRoute, onNavigate }: LayoutProps) {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  type IconType = React.ComponentType<{ className?: string }>;
  type Role = 'super_admin' | 'admin' | 'student';
  const navigation: Array<{ name: string; icon: IconType; route: Route; roles: Role[] }> = [
    { name: 'Dashboard', icon: LayoutDashboard, route: 'dashboard', roles: ['super_admin', 'admin', 'student'] },
    { name: 'Courses', icon: BookOpen, route: 'courses', roles: ['super_admin', 'admin'] },
    { name: 'Users', icon: Users, route: 'users', roles: ['super_admin', 'admin'] },
    { name: 'Groups', icon: Users, route: 'groups', roles: ['super_admin', 'admin'] },
    { name: 'Assessments', icon: FileText, route: 'assessments', roles: ['super_admin', 'admin', 'student'] },
    { name: 'Results', icon: CheckCircle, route: 'results', roles: ['super_admin', 'admin'] },
    { name: 'Live Monitor', icon: Code, route: 'monitor', roles: ['super_admin', 'admin'] },
    { name: 'Notifications', icon: Bell, route: 'notifications', roles: ['super_admin', 'admin', 'student'] },
    { name: 'Question Bank', icon: FileText, route: 'qb', roles: ['super_admin', 'admin'] },
    { name: 'Settings', icon: Settings, route: 'settings', roles: ['super_admin', 'admin'] },
  ];

  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(user?.role || 'student')
  );

  function handleNavigate(route: Route) {
    onNavigate(route);
    setSidebarOpen(false);
  }

  const [unread, setUnread] = useState(0);
  useEffect(()=>{
    function onLocalUpdate(e: any){ if (typeof e?.detail === 'number') setUnread(e.detail); }
    window.addEventListener('notify:unread', onLocalUpdate as any);
    let t: any;
    async function load(){ try { const u = await api.get<{count:number}>('/notifications/unread-count'); setUnread(u.count||0); } catch {} }
    load();
    t = setInterval(load, 2000);
    const vis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', vis);
    return ()=> { clearInterval(t); window.removeEventListener('notify:unread', onLocalUpdate as any); document.removeEventListener('visibilitychange', vis); };
  }, [currentRoute]);

  // SSE subscription for instant badge updates
  useEffect(()=>{
    const token = sessionStorage.getItem('lms_token');
    if (!token) return;
    const base = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000';
    const es = new EventSource(`${base}/notifications/stream?token=${encodeURIComponent(token)}`);
    const onUnread = (e: MessageEvent) => { try { const d = JSON.parse(e.data||'{}'); if (typeof d.count === 'number') setUnread(d.count); } catch {} };
    const onNew = (_e: MessageEvent) => { setUnread((u)=> u+1); };
    es.addEventListener('unread', onUnread as any);
    es.addEventListener('new', onNew as any);
    return ()=> { es.close(); };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:flex">
        {/* Mobile overlay for sidebar */}
        {currentRoute === 'dashboard' && (
          <div
            className={`fixed inset-0 bg-gray-900 bg-opacity-75 z-40 lg:hidden transition-opacity ${
              sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar only on dashboard */}
        {currentRoute === 'dashboard' && (
          <aside
            className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform lg:translate-x-0 lg:static ${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-900">LMS Portal</h1>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {filteredNavigation.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleNavigate(item.route)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      currentRoute === item.route
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}{item.route==='notifications' && unread>0 ? (<span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-600 text-white">{unread}</span>) : null}</span>
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3 px-4 py-2 mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role.replace('_', ' ')}</p>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Main */}
        <div className="flex-1">
          <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-8">
            {currentRoute === 'dashboard' && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700 mr-4"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <div className="flex-1 flex items-center gap-3">
              {currentRoute !== 'dashboard' && (
                <button onClick={() => onNavigate('dashboard')} className="px-3 py-1.5 border rounded hover:bg-gray-50">← Back</button>
              )}
              <h2 className="text-lg font-semibold text-gray-900">
                Welcome back, {user?.full_name}
              </h2>
            </div>
          </header>

          <main className="p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
