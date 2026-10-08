import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Dumbbell,
  CreditCard,
  Building2,
  BarChart3,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/format';

const ownerNav = [
  { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Members',
    icon: Users,
    children: [
      { to: '/owner/members', label: 'All Members' },
      { to: '/owner/members/active', label: 'Active' },
      { to: '/owner/members/expiring', label: 'Expiring Soon' },
      { to: '/owner/members/expired', label: 'Expired' },
    ],
  },
  { to: '/owner/admissions', label: 'Admissions', icon: UserPlus },
  {
    label: 'Trainers',
    icon: Dumbbell,
    children: [
      { to: '/owner/trainers', label: 'All Trainers' },
      { to: '/owner/trainers/attendance', label: 'Attendance' },
      { to: '/owner/trainers/performance', label: 'Performance' },
    ],
  },
  {
    label: 'Memberships',
    icon: CreditCard,
    children: [
      { to: '/owner/memberships/plans', label: 'Plans' },
      { to: '/owner/payments', label: 'Payments' },
    ],
  },
  { to: '/owner/branches', label: 'Branches', icon: Building2 },
  {
    label: 'Reports',
    icon: BarChart3,
    children: [
      { to: '/owner/reports/members', label: 'Members' },
      { to: '/owner/reports/admissions', label: 'Admissions' },
      { to: '/owner/reports/trainers', label: 'Trainers' },
      { to: '/owner/reports/attendance', label: 'Attendance' },
    ],
  },
  { to: '/owner/settings', label: 'Settings', icon: Settings },
];

const trainerNav = [
  { to: '/trainer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/trainer/members', label: 'My Members', icon: Users },
  { to: '/trainer/admissions/new', label: 'New Admission', icon: UserPlus },
  {
    label: 'Memberships',
    icon: CreditCard,
    children: [
      { to: '/trainer/memberships/active', label: 'Active' },
      { to: '/trainer/memberships/expiring', label: 'Expiring Soon' },
      { to: '/trainer/memberships/expired', label: 'Expired' },
    ],
  },
  { to: '/trainer/attendance', label: 'Attendance', icon: Dumbbell },
  { to: '/trainer/profile', label: 'Profile', icon: Settings },
];

function Item({ to, label, icon: Icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
          isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
        )
      }
    >
      {Icon ? <Icon size={16} /> : <span className="w-4" />}
      {label}
    </NavLink>
  );
}

function Group({ item, onClick }) {
  const location = useLocation();
  const openByDefault = item.children.some((c) => location.pathname.startsWith(c.to));
  const [open, setOpen] = useState(openByDefault);
  const Icon = item.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/70 hover:text-white"
      >
        <span className="flex items-center gap-3">
          <Icon size={16} />
          {item.label}
        </span>
        <ChevronDown size={14} className={cn('transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="ml-4 mt-1 space-y-1 border-l border-slate-800 pl-3">
          {item.children.map((child) => (
            <Item key={child.to} {...child} onClick={onClick} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Sidebar({ role, onNavigate }) {
  const items = role === 'OWNER' ? ownerNav : trainerNav;
  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-800 px-5 py-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Gym Management</p>
        <p className="mt-1 text-lg font-semibold">SaaS Console</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) =>
          item.children ? (
            <Group key={item.label} item={item} onClick={onNavigate} />
          ) : (
            <Item key={item.to} {...item} onClick={onNavigate} />
          )
        )}
      </nav>
    </aside>
  );
}
