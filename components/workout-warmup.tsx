export function WorkoutWarmup({ warmup, status }: { warmup?: string | null; status?: "completed" | "skipped" | null }) {
  if (!warmup) return null
  return <section aria-label="Prescribed warmup" className="space-y-2 rounded-xl border p-4">
    <h2 className="font-semibold">Prescribed warmup</h2>
    {status && <p className="text-sm text-muted-foreground">{status === "completed" ? "Done" : "Skipped"}</p>}
    <p className="whitespace-pre-wrap break-words text-sm">{warmup}</p>
  </section>
}
