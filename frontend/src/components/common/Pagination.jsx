export default function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, total } = pagination;
  return (
    <div className="flex flex-col gap-3 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>{total} records</span>
      <div className="grid grid-cols-3 items-center gap-2 sm:flex">
        <button
          type="button"
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-700 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <span className="text-center font-medium text-slate-700">
          {page} / {pages}
        </span>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-medium text-slate-700 disabled:opacity-40"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
