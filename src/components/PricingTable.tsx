export function PricingTable({ rows, title }: { rows: Array<{ label: string; value: string }>; title: string }) {
  return (
    <div className="card p-6">
      <h3 className="font-bold mb-4">{title}</h3>
      <dl className="text-sm space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3 rounded-lg px-3 py-2" style={{ background: 'var(--bg-2)' }}>
            <dt className="text-muted">{r.label}</dt>
            <dd className="font-semibold text-end">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
