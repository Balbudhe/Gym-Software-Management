import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BranchProvider } from '../../context/BranchContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Spinner from '../common/Spinner';

export default function OwnerLayout() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'OWNER') return <Navigate to="/trainer/dashboard" replace />;

  return (
    <BranchProvider>
      <div className="flex min-h-screen bg-slate-50">
        <div className="hidden lg:block">
          <Sidebar role="OWNER" />
        </div>
        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
            <div className="relative h-full w-64">
              <Sidebar role="OWNER" onNavigate={() => setOpen(false)} />
            </div>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenu={() => setOpen(true)} />
          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </BranchProvider>
  );
}
