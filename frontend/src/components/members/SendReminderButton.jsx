import { useState } from 'react';
import { Bell } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { canSendMembershipReminder } from '../../utils/membershipReminder';
import { cn } from '../../utils/format';

export default function SendReminderButton({ member, className, compact = false }) {
  const toast = useToast();
  const [sending, setSending] = useState(false);

  if (!canSendMembershipReminder(member)) return null;

  const send = async (event) => {
    event?.stopPropagation?.();
    if (sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/members/${member._id}/send-reminder`);
      const result = data.result || {};
      const ok = result.emailSent || result.smsSent;
      toast.push(
        data.message ||
          (ok
            ? `Sent${result.emailSent ? ` email to ${result.emailTo || member.email}` : ''}${
                result.emailSent && result.smsSent ? ' and' : ''
              }${result.smsSent ? ` SMS to ${result.smsTo || member.phone}` : ''}`
            : 'Reminder processed'),
        ok ? 'success' : 'error'
      );
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not send reminder', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={send}
      disabled={sending}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 transition hover:text-amber-800 disabled:opacity-60',
        compact && 'rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5',
        className
      )}
      title="Send email and SMS membership reminder"
    >
      <Bell size={14} />
      {sending ? 'Sending…' : 'Send reminder'}
    </button>
  );
}
