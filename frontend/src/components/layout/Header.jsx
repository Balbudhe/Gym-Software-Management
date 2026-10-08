import { Bell, ChevronsUpDown, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useToast } from '../../context/ToastContext';
import { useTrainerShift } from '../../context/TrainerShiftContext';
import { initials } from '../../utils/format';

export default function Header({ onMenu }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const shift = useTrainerShift();
  const branch = useBranch();
  const isOwner = user?.role === 'OWNER';
  const logoutLocked = user?.role === 'TRAINER' && !!shift?.onShift;

  const handleLogout = async () => {
    if (logoutLocked) {
      toast.push('Check out before logging out. The owner is notified if you leave during a shift.', 'error');
      return;
    }
    try {
      await logout();
    } catch (error) {
      if (error.code === 'SHIFT_LOCK') {
        toast.push(error.message, 'error');
        return;
      }
      toast.push(error.message || 'Could not log out', 'error');
    }
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3">
        <button type="button" className="rounded-lg border border-slate-200 p-2 lg:hidden" onClick={onMenu}>
          <Menu size={18} />
        </button>
        <div>
          <p className="text-sm font-semibold text-slate-900">GYM MANAGEMENT</p>
          {isOwner && branch?.currentBranch ? (
            <p className="text-xs text-slate-500">Current Branch: {branch.currentBranch.name}</p>
          ) : user?.branchName ? (
            <p className="text-xs text-slate-500">Branch: {user.branchName}</p>
          ) : (
            <p className="text-xs text-slate-500">{user?.gymName}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isOwner ? (
          <label className="flex max-w-[220px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Branch:</span>
            <select
              className="border-0 bg-transparent p-0 shadow-none focus:ring-0"
              value={branch.selectedBranch}
              onChange={(e) => branch.selectBranch(e.target.value)}
            >
              <option value="ALL">All Branches</option>
              {branch.branches.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronsUpDown size={14} className="text-slate-400" />
          </label>
        ) : null}

        <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-500">
          <Bell size={16} />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {initials(user?.name)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-tight">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={handleLogout}
            title={logoutLocked ? 'Check out before logging out' : 'Logout'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
