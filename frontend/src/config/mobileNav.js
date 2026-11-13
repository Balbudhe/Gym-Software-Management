import {
  LayoutDashboard,
  Users,
  UserPlus,
  Dumbbell,
  CreditCard,
  Building2,
  BarChart3,
  Settings,
  ClipboardCheck,
  MoreHorizontal,
} from 'lucide-react';

export const ownerPrimaryTabs = [
  { to: '/owner/dashboard', label: 'Home', icon: LayoutDashboard, match: (path) => path.startsWith('/owner/dashboard') },
  { to: '/owner/members', label: 'Members', icon: Users, match: (path) => path.startsWith('/owner/members') },
  { to: '/owner/admissions/new', label: 'Admit', icon: UserPlus, match: (path) => path.includes('/admissions') },
  { to: '/owner/trainers', label: 'Trainers', icon: Dumbbell, match: (path) => path.startsWith('/owner/trainers') },
  { to: '__more__', label: 'More', icon: MoreHorizontal, match: () => false },
];

export const ownerMoreLinks = [
  { to: '/owner/memberships/plans', label: 'Membership plans', icon: CreditCard },
  { to: '/owner/payments', label: 'Payments', icon: CreditCard },
  { to: '/owner/branches', label: 'Branches', icon: Building2 },
  { to: '/owner/trainers/attendance', label: 'Trainer attendance', icon: ClipboardCheck },
  { to: '/owner/trainers/performance', label: 'Trainer performance', icon: BarChart3 },
  { to: '/owner/reports/members', label: 'Reports', icon: BarChart3 },
  { to: '/owner/settings', label: 'Settings', icon: Settings },
];

export const trainerPrimaryTabs = [
  { to: '/trainer/dashboard', label: 'Home', icon: LayoutDashboard, match: (path) => path.startsWith('/trainer/dashboard') },
  { to: '/trainer/members', label: 'Members', icon: Users, match: (path) => path.startsWith('/trainer/members') || path.startsWith('/trainer/memberships') },
  { to: '/trainer/admissions/new', label: 'Admit', icon: UserPlus, match: (path) => path.includes('/admissions') },
  { to: '/trainer/attendance', label: 'Attendance', icon: ClipboardCheck, match: (path) => path.startsWith('/trainer/attendance') },
  { to: '/trainer/profile', label: 'Profile', icon: Settings, match: (path) => path.startsWith('/trainer/profile') },
];
