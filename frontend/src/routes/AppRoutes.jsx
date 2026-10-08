import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OwnerLayout from '../components/layout/OwnerLayout';
import TrainerLayout from '../components/layout/TrainerLayout';
import Login from '../pages/auth/Login';
import Signup from '../pages/auth/Signup';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import OwnerDashboard from '../pages/owner/Dashboard';
import OwnerMembers from '../pages/owner/Members';
import OwnerAdmissions from '../pages/owner/Admissions';
import NewAdmission from '../pages/owner/NewAdmission';
import OwnerTrainers from '../pages/owner/Trainers';
import TrainerDetail from '../pages/owner/TrainerDetail';
import TrainerAttendance from '../pages/owner/TrainerAttendance';
import TrainerPerformance from '../pages/owner/TrainerPerformance';
import MembershipPlans from '../pages/owner/MembershipPlans';
import Branches from '../pages/owner/Branches';
import BranchDetail from '../pages/owner/BranchDetail';
import Reports from '../pages/owner/Reports';
import Settings from '../pages/owner/Settings';
import OwnerPayments from '../pages/owner/Payments';
import TrainerDashboard from '../pages/trainer/Dashboard';
import MyMembers from '../pages/trainer/MyMembers';
import TrainerNewAdmission from '../pages/trainer/NewAdmission';
import TrainerAttendancePage from '../pages/trainer/Attendance';
import TrainerProfile from '../pages/trainer/Profile';
import Spinner from '../components/common/Spinner';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'OWNER' ? '/owner/dashboard' : '/trainer/dashboard'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/owner" element={<OwnerLayout />}>
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="members" element={<OwnerMembers />} />
        <Route path="members/active" element={<OwnerMembers />} />
        <Route path="members/expiring" element={<OwnerMembers />} />
        <Route path="members/expired" element={<OwnerMembers />} />
        <Route path="admissions" element={<OwnerAdmissions />} />
        <Route path="admissions/new" element={<NewAdmission />} />
        <Route path="trainers" element={<OwnerTrainers />} />
        <Route path="trainers/attendance" element={<TrainerAttendance />} />
        <Route path="trainers/performance" element={<TrainerPerformance />} />
        <Route path="trainers/:id" element={<TrainerDetail />} />
        <Route path="memberships/plans" element={<MembershipPlans />} />
        <Route path="payments" element={<OwnerPayments />} />
        <Route path="branches" element={<Branches />} />
        <Route path="branches/:id" element={<BranchDetail />} />
        <Route path="reports/members" element={<Reports />} />
        <Route path="reports/admissions" element={<Reports />} />
        <Route path="reports/trainers" element={<Reports />} />
        <Route path="reports/attendance" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/trainer" element={<TrainerLayout />}>
        <Route path="dashboard" element={<TrainerDashboard />} />
        <Route path="members" element={<MyMembers />} />
        <Route path="admissions/new" element={<TrainerNewAdmission />} />
        <Route path="memberships/active" element={<MyMembers status="active" />} />
        <Route path="memberships/expiring" element={<MyMembers status="expiring" />} />
        <Route path="memberships/expired" element={<MyMembers status="expired" />} />
        <Route path="attendance" element={<TrainerAttendancePage />} />
        <Route path="profile" element={<TrainerProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
