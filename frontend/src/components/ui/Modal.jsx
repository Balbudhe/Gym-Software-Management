export default function Modal({ open, title, children, onClose, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-label="Close" />
      <div className={`relative max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? 'w-full max-w-3xl' : 'w-full max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
