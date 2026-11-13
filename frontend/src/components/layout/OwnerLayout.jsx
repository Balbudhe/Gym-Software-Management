import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BranchProvider } from '../../context/BranchContext';
import Sidebar from './Sidebar';
import Header from './Header';
import ScrollMain from './ScrollMain';
import Spinner from '../common/Spinner';
import MobileBottomNav from '../mobile/MobileBottomNav';
import MobileMoreSheet from '../mobile/MobileMoreSheet';
import InstallPrompt from '../mobile/InstallPrompt';
import OnlineStatus from '../mobile/OnlineStatus';
import { ownerMoreLinks, ownerPrimaryTabs } from '../../config/mobileNav';

function OwnerShell() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const moreActive = ownerMoreLinks.some((link) => pathname.startsWith(link.to));

  const refresh = async () => {
    window.dispatchEvent(new CustomEvent('app:refresh'));
    await new Promise((resolve) => setTimeout(resolve, 450));
  };

  return (
    <div className="app-shell flex h-dvh overflow-hidden bg-slate-50">
      <div className="hidden h-full shrink-0 lg:block">
        <Sidebar role="OWNER" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <OnlineStatus />
        <Header mobileApp />
        <ScrollMain onRefresh={refresh}>
          <Outlet />
        </ScrollMain>
        <MobileBottomNav
          tabs={ownerPrimaryTabs}
          activeMore={moreOpen || moreActive}
          onMore={() => setMoreOpen(true)}
        />
        <MobileMoreSheet
          open={moreOpen}
          title="More"
          links={ownerMoreLinks}
          onClose={() => setMoreOpen(false)}
        />
        <InstallPrompt />
      </div>
    </div>
  );
}

export default function OwnerLayout() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'OWNER') return <Navigate to="/trainer/dashboard" replace />;

  return (
    <BranchProvider>
      <OwnerShell />
    </BranchProvider>
  );
}
