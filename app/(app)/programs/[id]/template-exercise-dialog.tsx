"use client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Exercise, TemplateExercise } from "@/lib/db/schema"
import { Plus } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

const LOADING_ITEMS = [
  { value: "fixed", label: "Fixed weight (kg)" },
  { value: "pb_percent", label: "% of Personal Best" },
  { value: "rpe", label: "RPE target" },
]

interface TemplateExerciseDialogProps {
  addExOpen: boolean
  pending: boolean
  setAddExOpen: Dispatch<SetStateAction<boolean>>
  resetExForm: () => void
  editingExercise: TemplateExercise | null
  section: string
  setEditingExercise: Dispatch<SetStateAction<TemplateExercise | null>>
  exercises: Exercise[]
  selectedExId: number | null
  setSelectedExId: Dispatch<SetStateAction<number | null>>
  setNewExOpen: Dispatch<SetStateAction<boolean>>
  setsMin: string
  setSetsMin: Dispatch<SetStateAction<string>>
  setsMax: string
  setSetsMax: Dispatch<SetStateAction<string>>
  targetType: string
  setTargetType: Dispatch<SetStateAction<string>>
  repsMin: string
  setRepsMin: Dispatch<SetStateAction<string>>
  repsMax: string
  setRepsMax: Dispatch<SetStateAction<string>>
  repsBySetText: string
  setRepsBySetText: Dispatch<SetStateAction<string>>
  superset: string
  setSuperset: Dispatch<SetStateAction<string>>
  totalRepsMin: string
  setTotalRepsMin: Dispatch<SetStateAction<string>>
  totalRepsMax: string
  setTotalRepsMax: Dispatch<SetStateAction<string>>
  weightType: string
  setWeightType: Dispatch<SetStateAction<string>>
  weightValue: string
  setWeightValue: Dispatch<SetStateAction<string>>
  percentText: string
  setPercentText: Dispatch<SetStateAction<string>>
  rpeTarget: string
  setRpeTarget: Dispatch<SetStateAction<string>>
  exNotes: string
  setExNotes: Dispatch<SetStateAction<string>>
  exerciseError: string
  handleAddExercise: () => void
  validPrescription: boolean
}

export function TemplateExerciseDialog({
  addExOpen,
  pending,
  setAddExOpen,
  resetExForm,
  editingExercise,
  section,
  setEditingExercise,
  exercises,
  selectedExId,
  setSelectedExId,
  setNewExOpen,
  setsMin,
  setSetsMin,
  setsMax,
  setSetsMax,
  targetType,
  setTargetType,
  repsMin,
  setRepsMin,
  repsMax,
  setRepsMax,
  repsBySetText,
  setRepsBySetText,
  superset,
  setSuperset,
  totalRepsMin,
  setTotalRepsMin,
  totalRepsMax,
  setTotalRepsMax,
  weightType,
  setWeightType,
  weightValue,
  setWeightValue,
  percentText,
  setPercentText,
  rpeTarget,
  setRpeTarget,
  exNotes,
  setExNotes,
  exerciseError,
  handleAddExercise,
  validPrescription,
}: TemplateExerciseDialogProps) {
  return (
    <Dialog open={addExOpen} onOpenChange={(open) => { if (pending) return; setAddExOpen(open); if (!open) resetExForm() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingExercise ? "Edit" : "Add"} {section === "accessory" ? "Accessory" : "Exercise"}</DialogTitle>
          <DialogDescription>Prescribe sets, reps or time, and loading for this exercise.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            {editingExercise?.freePickCriteria && <div className="space-y-2"><Label htmlFor="edit-criteria">Free-pick criteria</Label><Textarea id="edit-criteria" value={editingExercise.freePickCriteria} onChange={(e) => setEditingExercise({ ...editingExercise, freePickCriteria: e.target.value })} /></div>}
            {!editingExercise?.freePickCriteria && <>
              <Label>Exercise</Label>
              <div className="flex gap-2">
                <Select
                  items={exercises.map((ex) => ({ value: String(ex.id), label: ex.name }))}
                  value={selectedExId !== null ? String(selectedExId) : null}
                  onValueChange={(v) => setSelectedExId(v === null ? null : Number(v))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select exercise..." />
                  </SelectTrigger>
                  <SelectContent>
                    {exercises.map((ex) => (
                      <SelectItem key={ex.id} value={String(ex.id)}>{ex.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setNewExOpen(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exercise-target-type">Target per set</Label>
            <select id="exercise-target-type" className="w-full rounded-md border bg-background p-2" value={targetType} onChange={(e) => { setTargetType(e.target.value); setRepsMin(e.target.value === "time" ? "30" : "5"); setRepsMax("") }}>
              <option value="reps">Reps</option><option value="per_set">Reps by set</option><option value="time">Time (seconds)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sets (min)</Label>
              <Input type="number" min={1} value={setsMin} onChange={(e) => setSetsMin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Sets (max, optional)</Label>
              <Input type="number" min={1} placeholder="Same as min" value={setsMax} onChange={(e) => setSetsMax(e.target.value)} />
            </div>
            {targetType !== "per_set" && <><div className="space-y-1.5">
              <Label>{targetType === "time" ? "Seconds (min)" : "Reps (min)"}</Label>
              <Input type="number" min={1} value={repsMin} onChange={(e) => setRepsMin(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{targetType === "time" ? "Seconds (max, optional)" : "Reps (max, optional)"}</Label>
              <Input type="number" min={1} placeholder="Same as min" value={repsMax} onChange={(e) => setRepsMax(e.target.value)} />
            </div></>}
          </div>
          {targetType === "per_set" && <div className="space-y-1.5">
            <Label htmlFor="reps-by-set">Reps by set</Label>
            <Input id="reps-by-set" value={repsBySetText} onChange={(e) => setRepsBySetText(e.target.value)} placeholder="5, 3, 1" aria-describedby="reps-by-set-help" />
            <p id="reps-by-set-help" className="text-xs text-muted-foreground">Enter one rep count for every set, including optional sets, separated by commas. For example: 5, 3, 1 means set 1: 5 reps, set 2: 3 reps, set 3: 1 rep.</p>
          </div>}

          {section === "accessory" && <div className="space-y-1.5">
            <Label htmlFor="superset">Superset name (optional)</Label>
            <Input id="superset" placeholder="Use the same name for 2+ exercises" value={superset} onChange={(e) => setSuperset(e.target.value)} />
          </div>}
          {section === "main" && targetType !== "time" && <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="total-reps-min">Total reps (min, optional)</Label><Input id="total-reps-min" type="number" min={1} value={totalRepsMin} onChange={(e) => setTotalRepsMin(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="total-reps-max">Total reps (max, optional)</Label><Input id="total-reps-max" type="number" min={1} placeholder="Same as min" value={totalRepsMax} onChange={(e) => setTotalRepsMax(e.target.value)} /></div>
          </div>}
          {section === "main" && <div className="space-y-1.5">
            <Label>Loading type</Label>
            <Select items={LOADING_ITEMS} value={weightType} onValueChange={(value) => { if (value !== null) setWeightType(value) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOADING_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>}

          {weightType === "fixed" && (
            <div className="space-y-1.5">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.5" placeholder="e.g. 100" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} />
            </div>
          )}
          {weightType === "pb_percent" && (
            <div className="space-y-1.5">
              <Label>Percentage of PB (%)</Label>
              <Input placeholder="75 or 75-80 or 70, 75, 80" value={percentText} onChange={(e) => setPercentText(e.target.value)} />
              <p className="text-xs text-muted-foreground">One percentage or range for all sets, or comma-separated targets for every set (including optional sets). Each set can also have a range.</p>
            </div>
          )}
          {weightType === "rpe" && (
            <div className="space-y-1.5">
              <Label>RPE target (optional)</Label>
              <Input type="number" min={1} max={10} step="0.5" placeholder="e.g. 8" value={rpeTarget} onChange={(e) => setRpeTarget(e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input placeholder="Coaching cues, focus points..." value={exNotes} onChange={(e) => setExNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => { setAddExOpen(false); resetExForm() }}>Cancel</Button>
          {exerciseError && <p role="alert" className="text-sm text-destructive">{exerciseError}</p>}
          <Button onClick={handleAddExercise} disabled={pending || (!selectedExId && !editingExercise?.freePickCriteria) || !validPrescription}>{pending ? "Saving..." : editingExercise ? "Save changes" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
