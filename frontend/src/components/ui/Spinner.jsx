export default function Spinner() {
  return <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-700" />;
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner />
    </div>
  );
}
