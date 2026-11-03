import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BranchProvider } from '../../context/BranchContext';
import { TrainerShiftProvider, useTrainerShift } from '../../context/TrainerShiftContext';
import Sidebar from './Sidebar';
import Header from './Header';
import ScrollMain from './ScrollMain';
import Spinner from '../common/Spinner';

function ShiftBanner() {
  const shift = useTrainerShift();
  if (!shift?.onShift) return null;
  if (shift.outsideGym) {
    return (
      <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
        You are more than 200m from your check-in location. The gym owner has been notified by SMS.
      </div>
    );
  }
  return (
    <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
      Shift in progress. Stay within 200m of check-in. Check out before you leave — logout stays locked until then.
    </div>
  );
}

function TrainerShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <div className="hidden h-full shrink-0 lg:block">
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
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenu={() => setOpen(true)} />
        <ShiftBanner />
        <ScrollMain>
          <Outlet />
        </ScrollMain>
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
