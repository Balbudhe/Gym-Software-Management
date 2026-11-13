export default function FormField({ label, error, required = false, children }) {
  return (
    <label className="block w-full text-sm">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-xs leading-4 text-red-600">{error}</span> : null}
    </label>
  );
}
