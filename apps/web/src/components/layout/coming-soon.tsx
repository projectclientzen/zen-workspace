export function ComingSoon({ title, sprint }: { title: string; sprint: string }) {
  return (
    <div className="mx-auto max-w-[860px] px-7 py-6">
      <div className="font-serif text-2xl font-medium">{title}</div>
      <div className="mt-3 rounded-2xl border border-dashed border-faint p-8 text-center text-muted-foreground">
        <div className="font-serif text-lg italic">Belum dikerjakan.</div>
        <div className="mt-1 text-[12.5px]">Bagian dari {sprint} — lihat FE_Tasks_Personal_Dashboard.md.</div>
      </div>
    </div>
  );
}
