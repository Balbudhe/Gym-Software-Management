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
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={danger ? 'rounded-lg bg-red-600 px-4 py-2 text-sm text-white' : 'rounded-lg bg-slate-900 px-4 py-2 text-sm text-white'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
