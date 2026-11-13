import { ChevronsUpDown, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useToast } from '../../context/ToastContext';
import { useTrainerShift } from '../../context/TrainerShiftContext';
import { initials } from '../../utils/format';
import { haptic } from '../../utils/haptics';

export default function Header({ onMenu, mobileApp = false }) {
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
      haptic(10);
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
    <header className="app-header sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:bg-white lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {!mobileApp ? (
            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2 lg:hidden"
              onClick={onMenu}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
              {mobileApp ? user?.gymName || 'Gym Management' : 'GYM MANAGEMENT'}
            </p>
            {isOwner && branch?.currentBranch ? (
              <p className="truncate text-xs text-slate-500">Branch: {branch.currentBranch.name}</p>
            ) : user?.branchName ? (
              <p className="truncate text-xs text-slate-500">Branch: {user.branchName}</p>
            ) : (
              <p className="truncate text-xs text-slate-500">{user?.role === 'OWNER' ? 'Owner console' : 'Trainer app'}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isOwner ? (
            <label className="hidden max-w-[200px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:flex">
              <span className="text-slate-500">Branch</span>
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

          <div className="flex items-center gap-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials(user?.name)}
            </div>
            <button
              type="button"
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              onClick={handleLogout}
              title={logoutLocked ? 'Check out before logging out' : 'Logout'}
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {isOwner && mobileApp ? (
        <div className="mt-3 sm:hidden">
          <select
            className="w-full rounded-xl border-slate-200 bg-slate-50 text-sm"
            value={branch.selectedBranch}
            onChange={(e) => branch.selectBranch(e.target.value)}
            aria-label="Select branch"
          >
            <option value="ALL">All Branches</option>
            {branch.branches.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </header>
  );
}
