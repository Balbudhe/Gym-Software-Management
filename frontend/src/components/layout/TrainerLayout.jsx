import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BranchProvider } from '../../context/BranchContext';
import { TrainerShiftProvider, useTrainerShift } from '../../context/TrainerShiftContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Spinner from '../common/Spinner';

function ShiftBanner() {
  const shift = useTrainerShift();
  if (!shift?.onShift) return null;
  return (
    <div className={`border-b px-4 py-2 text-sm ${shift.outsideGym ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
      {shift.outsideGym
        ? 'You appear to be away from your check-in location. The gym owner has been notified.'
        : 'Shift in progress. Location is tracked until you check out. Logout stays locked until then.'}
    </div>
  );
}

function TrainerShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden lg:block">
        <Sidebar role="TRAINER" />
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64">
            <Sidebar role="TRAINER" onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenu={() => setOpen(true)} />
        <ShiftBanner />
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function TrainerLayout() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'TRAINER') return <Navigate to="/owner/dashboard" replace />;

  return (
    <BranchProvider>
      <TrainerShiftProvider>
        <TrainerShell />
      </TrainerShiftProvider>
    </BranchProvider>
  );
}
