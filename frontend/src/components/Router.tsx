import { useAuth } from '../contexts/AuthContext';
import SuperAdminDashboard from './dashboards/SuperAdminDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import StudentDashboard from './dashboards/StudentDashboard';
import UserManagement from './users/UserManagement';
import CourseManagement from './courses/CourseManagement';
import GroupsManagement from './users/GroupsManagement';
import AssessmentManagement from './assessments/AssessmentManagement';
import ResultsManagement from './assessments/ResultsManagement';
import StudentAssessments from './student/StudentAssessments';

export type Route =
  | 'dashboard'
  | 'users'
  | 'groups'
  | 'courses'
  | 'assessments'
  | 'results'
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

  if (currentRoute === 'groups' && (user.role === 'super_admin' || user.role === 'admin')) {
    return <GroupsManagement />;
  }

  if (currentRoute === 'courses' && (user.role === 'super_admin' || user.role === 'admin')) {
    return <CourseManagement />;
  }

  if (currentRoute === 'assessments') {
    if (user.role === 'super_admin' || user.role === 'admin') return <AssessmentManagement />;
    if (user.role === 'student') {
      return <StudentAssessments />;
    }
  }

  if (currentRoute === 'results' && (user.role === 'super_admin' || user.role === 'admin')) {
    return <ResultsManagement />;
  }

  return <div className="text-center py-12 text-gray-500">Coming soon...</div>;
}
