import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PageSpinner } from './components/ui/Spinner';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import TrainerDashboard from './pages/trainer/TrainerDashboard';
import MembersPage from './pages/shared/MembersPage';
import MemberDetail from './pages/shared/MemberDetail';
import MemberEdit from './pages/owner/MemberEdit';
import AdmissionsPage from './pages/owner/AdmissionsPage';
import AdmissionForm from './pages/shared/AdmissionForm';
import ExpiringPage from './pages/shared/ExpiringPage';
import ExpiredPage from './pages/shared/ExpiredPage';
import TrainersPage from './pages/owner/TrainersPage';
import TrainerForm from './pages/owner/TrainerForm';
import TrainerDetail from './pages/owner/TrainerDetail';
import OwnerAttendance from './pages/owner/OwnerAttendance';
import TrainerPerformance from './pages/owner/TrainerPerformance';
import PlansPage from './pages/owner/PlansPage';
import ReportsPage from './pages/owner/ReportsPage';
import SettingsPage from './pages/owner/SettingsPage';
import MyMembers from './pages/trainer/MyMembers';
import TrainerAttendancePage from './pages/trainer/TrainerAttendancePage';
import TrainerProfile from './pages/trainer/TrainerProfile';

function Guard({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function Guest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardSwitch() {
  const { user } = useAuth();
  return user?.role === 'OWNER' ? <OwnerDashboard /> : <TrainerDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />
      <Route
        element={
          <Guard>
            <AppLayout />
          </Guard>
        }
      >
        <Route path="/dashboard" element={<DashboardSwitch />} />
        <Route path="/members" element={<Guard roles={['OWNER']}><MembersPage /></Guard>} />
        <Route path="/members/active" element={<Guard roles={['OWNER']}><MembersPage presetStatus="active" title="Active members" /></Guard>} />
        <Route path="/members/expiring" element={<Guard roles={['OWNER']}><ExpiringPage /></Guard>} />
        <Route path="/members/expired" element={<Guard roles={['OWNER']}><ExpiredPage /></Guard>} />
        <Route path="/members/:id" element={<MemberDetail />} />
        <Route path="/members/:id/edit" element={<Guard roles={['OWNER']}><MemberEdit /></Guard>} />
        <Route path="/admissions" element={<Guard roles={['OWNER']}><AdmissionsPage /></Guard>} />
        <Route path="/admissions/new" element={<AdmissionForm />} />
        <Route path="/trainers" element={<Guard roles={['OWNER']}><TrainersPage /></Guard>} />
        <Route path="/trainers/new" element={<Guard roles={['OWNER']}><TrainerForm /></Guard>} />
        <Route path="/trainers/attendance" element={<Guard roles={['OWNER']}><OwnerAttendance /></Guard>} />
        <Route path="/trainers/performance" element={<Guard roles={['OWNER']}><TrainerPerformance /></Guard>} />
        <Route path="/trainers/:id" element={<Guard roles={['OWNER']}><TrainerDetail /></Guard>} />
        <Route path="/trainers/:id/edit" element={<Guard roles={['OWNER']}><TrainerForm /></Guard>} />
        <Route path="/plans" element={<Guard roles={['OWNER']}><PlansPage /></Guard>} />
        <Route path="/reports/:type" element={<Guard roles={['OWNER']}><ReportsPage /></Guard>} />
        <Route path="/settings" element={<Guard roles={['OWNER']}><SettingsPage /></Guard>} />
        <Route path="/my-members" element={<Guard roles={['TRAINER']}><MyMembers /></Guard>} />
        <Route path="/memberships/active" element={<Guard roles={['TRAINER']}><MembersPage presetStatus="active" title="Active memberships" trainerView /></Guard>} />
        <Route path="/memberships/expiring" element={<Guard roles={['TRAINER']}><ExpiringPage /></Guard>} />
        <Route path="/memberships/expired" element={<Guard roles={['TRAINER']}><ExpiredPage /></Guard>} />
        <Route path="/attendance" element={<Guard roles={['TRAINER']}><TrainerAttendancePage /></Guard>} />
        <Route path="/profile" element={<Guard roles={['TRAINER']}><TrainerProfile /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
