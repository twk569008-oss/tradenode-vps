import Link from 'next/link';

export function CtaBand({ title, subtitle, cta }: { title: string; subtitle: string; cta?: string }) {
  return (
    <div className="card card-hover p-10 text-center mt-12">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-muted mt-2 text-sm">{subtitle}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/plans" className="btn btn-primary">{cta ?? 'Explore VPS Plans'}</Link>
        <Link href="/register" className="btn btn-secondary">Create account</Link>
      </div>
    </div>
  );
}
