import Modal from './Modal';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm leading-6 text-slate-600">{message}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className={
            danger
              ? 'min-h-11 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white'
              : 'min-h-11 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white'
          }
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
