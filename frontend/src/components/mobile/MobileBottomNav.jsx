import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../utils/format';
import { haptic } from '../../utils/haptics';

export default function MobileBottomNav({ tabs, activeMore = false, onMore }) {
  const { pathname } = useLocation();

  return (
    <nav
      className="mobile-bottom-nav lg:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          if (tab.to === '__more__') {
            return (
              <button
                key="more"
                type="button"
                onClick={() => {
                  haptic(8);
                  onMore?.();
                }}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition',
                  activeMore ? 'text-brand-700' : 'text-slate-500'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition',
                    activeMore ? 'bg-brand-50 text-brand-700' : 'text-slate-500'
                  )}
                >
                  <Icon size={20} strokeWidth={activeMore ? 2.4 : 2} />
                </span>
                {tab.label}
              </button>
            );
          }

          const active = tab.match ? tab.match(pathname) : pathname.startsWith(tab.to);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              onClick={() => haptic(8)}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition',
                active ? 'text-brand-700' : 'text-slate-500'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition',
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-500'
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="truncate">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
