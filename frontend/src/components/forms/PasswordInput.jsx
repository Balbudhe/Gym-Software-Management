import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/format';

const PasswordInput = forwardRef(function PasswordInput(
  { className, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn('w-full pr-10', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((open) => !open)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-700"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
});

export default PasswordInput;
