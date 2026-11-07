"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { TemplateFunctionalBlock } from "@/lib/db/schema"
import { functionalHeading } from "@/lib/functional-fitness"

export function FunctionalWorkoutFields({ block, draft, status, pending, onChange, onSave }: {
  block: TemplateFunctionalBlock
  draft: { workout: string; scoreNotes: string; rpe: string }
  status: string
  pending: boolean
  onChange: (patch: Partial<typeof draft>) => void
  onSave: () => void
}) {
  return <Card>
    <CardHeader>
      <CardTitle>{functionalHeading(block)}</CardTitle>
      <p className="text-sm text-muted-foreground">{block.isProgrammed ? "Programmed workout" : "User-defined workout"}{block.source && ` · ${block.source}`}{block.durationMin != null && ` · ${block.durationMin} min`}</p>
      {block.details && <p className="text-sm whitespace-pre-wrap">{block.details}</p>}
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="functional-workout">Workout</Label>
        <Textarea id="functional-workout" rows={6} value={draft.workout} readOnly={block.isProgrammed} disabled={pending} onChange={(e) => onChange({ workout: e.target.value })} placeholder="Describe the workout you did, including movements, reps, rounds, and loads." />
        {block.isProgrammed && <p className="text-xs text-muted-foreground">Set in the program. Record any scaling in score / notes.</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="functional-score-notes">Score / notes</Label>
        <Textarea id="functional-score-notes" rows={4} value={draft.scoreNotes} disabled={pending} onChange={(e) => onChange({ scoreNotes: e.target.value })} placeholder="Time, rounds, reps, scaling, or how the workout felt." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="functional-rpe">RPE (1–10)</Label>
        <Input id="functional-rpe" type="number" inputMode="decimal" min={1} max={10} step={0.5} value={draft.rpe} disabled={pending} onChange={(e) => onChange({ rpe: e.target.value })} placeholder="e.g. 8" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted-foreground">{status}</p>
        <Button variant="outline" disabled={pending} onClick={onSave}>{pending ? "Saving..." : "Save result"}</Button>
      </div>
    </CardContent>
  </Card>
}
