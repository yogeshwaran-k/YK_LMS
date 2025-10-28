import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SuperAdminDashboard from './dashboards/SuperAdminDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import StudentDashboard from './dashboards/StudentDashboard';
import UserManagement from './users/UserManagement';
import CourseManagement from './courses/CourseManagement';
import AssessmentManagement from './assessments/AssessmentManagement';

export type Route =
  | 'dashboard'
  | 'users'
  | 'courses'
  | 'assessments'
  | 'certificates'
  | 'notifications'
  | 'settings';

interface RouterProps {
  currentRoute: Route;
}

export default function Router({ currentRoute }: RouterProps) {
  const { user } = useAuth();

  if (!user) return null;

  if (currentRoute === 'dashboard') {
    if (user.role === 'super_admin') return <SuperAdminDashboard />;
    if (user.role === 'admin') return <AdminDashboard />;
    if (user.role === 'student') return <StudentDashboard />;
  }

  if (currentRoute === 'users' && (user.role === 'super_admin' || user.role === 'admin')) {
    return <UserManagement />;
  }

  if (currentRoute === 'courses') {
    return <CourseManagement />;
  }

  if (currentRoute === 'assessments' && (user.role === 'super_admin' || user.role === 'admin')) {
    return <AssessmentManagement />;
  }

  return <div className="text-center py-12 text-gray-500">Coming soon...</div>;
}
