import type { ReactNode } from 'react';

export function AdminTable({ title, columns, rows }: {
  title: string;
  columns: string[];
  rows: { id: string; cells: ReactNode[] }[];
}) {
  return <section className="grid gap-4">
    <h1 className="text-2xl font-bold">{title}</h1>
    <div className="overflow-x-auto rounded-xl border">
      {rows.length ? <table className="w-full text-left text-sm">
        <thead><tr className="border-b bg-muted">{columns.map(column => <th key={column} scope="col" className="p-3">{column}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className="border-b last:border-0">
          {row.cells.map((cell, index) => <td key={columns[index]} className="p-3">{cell}</td>)}
        </tr>)}</tbody>
      </table> : <p className="p-4 text-sm text-muted-foreground">Sin registros.</p>}
    </div>
  </section>;
}

export function adminDate(date: Date) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Lima' }).format(date);
}
