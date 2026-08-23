import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

export default function Topbar({ onMenu }) {
  const { user, gym, logout } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={onMenu}>
          <Menu size={18} />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-900">{gym?.name}</p>
          <p className="text-xs text-slate-500">{user?.role === 'OWNER' ? 'Owner workspace' : 'Trainer workspace'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <Avatar name={user?.name} />
        <Button variant="secondary" size="sm" onClick={logout}>
          <LogOut size={14} /> Logout
        </Button>
      </div>
    </header>
  );
}
