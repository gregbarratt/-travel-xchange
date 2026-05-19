export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto w-full max-w-5xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
        </div>
        <div className="mt-6 h-52 animate-pulse rounded-lg bg-slate-100" />
      </section>
    </main>
  );
}
