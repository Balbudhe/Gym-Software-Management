import { cn } from '../../utils/format';

export default function DataTable({
  columns,
  rows,
  empty = 'No records found',
  onRowClick,
  mobileRender,
}) {
  if (!rows?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
        {empty}
      </div>
    );
  }

  return (
    <>
      {mobileRender ? (
        <div className="space-y-3 lg:hidden">
          {rows.map((row) => (
            <div key={row._id || row.id}>{mobileRender(row)}</div>
          ))}
        </div>
      ) : null}

      <div className={cn('table-wrap', mobileRender ? 'hidden lg:block' : '')}>
        <table className="data">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row._id || row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer' : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
