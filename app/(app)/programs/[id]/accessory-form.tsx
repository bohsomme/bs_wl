"use client"

import { useState, useTransition } from "react"
import type { Exercise } from "@/lib/db/schema"
import { addAccessoryGroup } from "@/lib/actions/programs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

const blank = () => ({ exerciseId: "", freePick: false, criteria: "", sets: "3", reps: "10", rpe: "" })

export function AccessoryForm({ templateId, exercises, onSaved }: { templateId: number; exercises: Exercise[]; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [superset, setSuperset] = useState(false)
  const [name, setName] = useState("")
  const [rows, setRows] = useState([blank()])
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  function update(index: number, patch: Partial<ReturnType<typeof blank>>) {
    setRows((prev) => prev.map((row, i) => i === index ? { ...row, ...patch } : row))
  }
  function save() {
    setError("")
    if (superset && !name.trim()) { setError("Enter a superset name."); return }
    if (rows.some((row) => row.freePick ? !row.criteria.trim() : !row.exerciseId)) { setError("Choose an exercise or enter free-pick criteria for each entry."); return }
    startTransition(async () => {
      try {
        await addAccessoryGroup({ workoutTemplateId: templateId, superset: superset ? name.trim() : undefined,
          exercises: rows.map((row) => ({ exerciseId: row.freePick ? null : Number(row.exerciseId), freePickCriteria: row.freePick ? row.criteria : undefined, setsMin: Number(row.sets), repsMin: Number(row.reps), rpeTarget: row.rpe ? Number(row.rpe) : undefined })) })
        await onSaved()
        setOpen(false)
      } catch (e) { setError(e instanceof Error ? e.message : "Could not save accessories.") }
    })
  }
  return <>
    <Button size="sm" variant="outline" onClick={() => { setRows([blank()]); setSuperset(false); setName(""); setError(""); setOpen(true) }}>Add Accessory</Button>
    <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value) }}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Accessories</DialogTitle><DialogDescription>Choose an individual exercise or build a whole superset.</DialogDescription></DialogHeader>
        <fieldset disabled={pending} className="space-y-4">
          <Label htmlFor="accessory-kind">Accessory type</Label>
          <select id="accessory-kind" className="w-full rounded-md border bg-background p-2" value={superset ? "superset" : "single"} onChange={(e) => { const grouped = e.target.value === "superset"; setSuperset(grouped); setRows(grouped ? [rows[0], blank()] : [{ ...rows[0], freePick: false }]) }}>
            <option value="single">Individual exercise</option><option value="superset">Superset</option>
          </select>
          {superset && <div className="space-y-2"><Label htmlFor="group-name">Superset name</Label><Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Upper-body accessories" /></div>}
          {rows.map((row, i) => <fieldset key={i} className="space-y-3 rounded-lg border p-3">
            <legend className="px-1 text-sm font-medium">Exercise {i + 1}</legend>
            {superset && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={row.freePick} onChange={(e) => update(i, { freePick: e.target.checked })} />Free-pick exercise</label>}
            {row.freePick ? <div className="space-y-2"><Label htmlFor={"criteria-" + i}>Criteria</Label><Textarea id={"criteria-" + i} value={row.criteria} onChange={(e) => update(i, { criteria: e.target.value })} placeholder="e.g. Upper-body pull; use dumbbells. Enter one or more criteria." /><p className="text-xs text-muted-foreground">Choose and name the exercise during the workout.</p></div> : <div className="space-y-2"><Label htmlFor={"exercise-" + i}>Exercise</Label><select id={"exercise-" + i} className="w-full rounded-md border bg-background p-2" value={row.exerciseId} onChange={(e) => update(i, { exerciseId: e.target.value })}><option value="">Select exercise...</option>{exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}</select></div>}
            <div className="grid grid-cols-3 gap-2">
              <div><Label htmlFor={"sets-" + i}>Sets</Label><Input id={"sets-" + i} type="number" min={1} value={row.sets} onChange={(e) => update(i, { sets: e.target.value })} /></div>
              <div><Label htmlFor={"reps-" + i}>Reps</Label><Input id={"reps-" + i} type="number" min={1} value={row.reps} onChange={(e) => update(i, { reps: e.target.value })} /></div>
              <div><Label htmlFor={"rpe-" + i}>RPE (optional)</Label><Input id={"rpe-" + i} type="number" min={1} max={10} step="0.5" value={row.rpe} onChange={(e) => update(i, { rpe: e.target.value })} /></div>
            </div>
            {superset && rows.length > 2 && <Button variant="ghost" onClick={() => setRows((prev) => prev.filter((_, index) => index !== i))}>Remove exercise</Button>}
          </fieldset>)}
          {superset && <Button variant="outline" onClick={() => setRows((prev) => [...prev, blank()])}>Add another exercise</Button>}
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={pending} onClick={save}>{pending ? "Saving..." : superset ? "Add superset" : "Add exercise"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>
}
