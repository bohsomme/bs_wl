"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function WarmupEditor({ initialValue, onSave, disabled }: {
  initialValue: string | null
  onSave: (warmup: string) => Promise<void>
  disabled: boolean
}) {
  const [warmup, setWarmup] = useState(initialValue ?? "")
  const [saved, setSaved] = useState(initialValue ?? "")
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  async function save() {
    setPending(true)
    setMessage("")
    setError("")
    try {
      await onSave(warmup)
      setSaved(warmup)
      setMessage("Warmup saved")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save warmup.")
    } finally { setPending(false) }
  }
  return <section className="space-y-2 rounded-lg border p-3">
    <Label htmlFor="prescribed-warmup">Prescribed warmup (optional)</Label>
    <Textarea id="prescribed-warmup" value={warmup} disabled={pending || disabled} rows={4}
      placeholder="e.g. 5 minutes easy rowing, then mobility and empty-bar drills"
      onChange={(event) => { setWarmup(event.target.value); setMessage(""); setError("") }} />
    <div className="flex items-center justify-between gap-2">
      <p role="status" className="text-xs text-muted-foreground">{message || (warmup !== saved ? "Unsaved changes" : "")}</p>
      <Button size="sm" variant="outline" disabled={pending || disabled || warmup === saved} onClick={save}>{pending ? "Saving..." : "Save warmup"}</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>
}
