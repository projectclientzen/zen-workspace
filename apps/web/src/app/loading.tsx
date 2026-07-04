export default function Loading() {
  return (
    <div className="mx-auto max-w-[1160px] animate-pulse px-7 py-6">
      <div className="mb-5 h-7 w-40 rounded bg-muted" />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[130px] rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded-2xl bg-muted" />
    </div>
  );
}
