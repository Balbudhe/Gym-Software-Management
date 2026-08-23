import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ClipboardList,
  Dumbbell,
  CreditCard,
  BarChart3,
  Settings,
  ChevronDown,
  UserRound,
  Camera,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { assetUrl } from '../../lib/utils';

function Item({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}

function Group({ label, icon: Icon, children, paths }) {
  const location = useLocation();
  const openByDefault = paths.some((p) => location.pathname.startsWith(p));
  const [open, setOpen] = useState(openByDefault);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"
      >
        <span className="flex items-center gap-3">
          <Icon size={16} />
          {label}
        </span>
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-3">{children}</div>}
    </div>
  );
}

function Sub({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block rounded-md px-2 py-1.5 text-sm ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Sidebar({ onNavigate }) {
  const { user, gym } = useAuth();
  const owner = user?.role === 'OWNER';

  return (
    <aside className="flex h-full w-64 flex-col bg-ink text-white">
      <div className="flex items-center gap-3 px-5 py-5">
        {gym?.logo ? (
          <img src={assetUrl(gym.logo)} alt="" className="h-9 w-9 rounded-lg object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold">A</div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">ApexFit</p>
          <p className="truncate text-xs text-slate-400">{gym?.name || 'Gym OS'}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6" onClick={onNavigate}>
        {owner ? (
          <>
            <Item to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <Group label="Members" icon={Users} paths={['/members']}>
              <Sub to="/members" label="All Members" />
              <Sub to="/members/active" label="Active" />
              <Sub to="/members/expiring" label="Expiring Soon" />
              <Sub to="/members/expired" label="Expired" />
            </Group>
            <Item to="/admissions" icon={ClipboardList} label="Admissions" />
            <Group label="Trainers" icon={Dumbbell} paths={['/trainers']}>
              <Sub to="/trainers" label="All Trainers" />
              <Sub to="/trainers/attendance" label="Attendance" />
              <Sub to="/trainers/performance" label="Performance" />
            </Group>
            <Group label="Memberships" icon={CreditCard} paths={['/plans']}>
              <Sub to="/plans" label="Plans" />
            </Group>
            <Group label="Reports" icon={BarChart3} paths={['/reports']}>
              <Sub to="/reports/members" label="Members" />
              <Sub to="/reports/admissions" label="Admissions" />
              <Sub to="/reports/trainers" label="Trainers" />
              <Sub to="/reports/attendance" label="Attendance" />
            </Group>
            <Item to="/settings" icon={Settings} label="Settings" />
          </>
        ) : (
          <>
            <Item to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <Item to="/my-members" icon={Users} label="My Members" />
            <Item to="/admissions/new" icon={UserPlus} label="New Admission" />
            <Group label="Memberships" icon={CreditCard} paths={['/memberships']}>
              <Sub to="/memberships/active" label="Active" />
              <Sub to="/memberships/expiring" label="Expiring Soon" />
              <Sub to="/memberships/expired" label="Expired" />
            </Group>
            <Item to="/attendance" icon={Camera} label="Attendance" />
            <Item to="/profile" icon={UserRound} label="Profile" />
          </>
        )}
      </nav>
    </aside>
  );
}
