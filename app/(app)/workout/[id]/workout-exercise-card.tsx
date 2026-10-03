"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { SetLog, TemplateExercise } from "@/lib/db/schema"
import { describeExerciseTarget, exerciseTarget, formatTarget, percentageAt, rangeStatus } from "@/lib/prescription"
import { cn } from "@/lib/utils"
import {
  NotebookPen,
  Plus,
  SkipForward
} from "lucide-react"
import type { Dispatch, SetStateAction } from "react"
import type { ExerciseLogRow } from "./workout-types"

const RPE_OPTIONS = ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"]

interface WorkoutExerciseCardProps {
  te: TemplateExercise | undefined
  currentRow: ExerciseLogRow
  chosenNames: Record<number, string>
  elId: number
  setChosenNames: Dispatch<SetStateAction<Record<number, string>>>
  skipExercise: (row: ExerciseLogRow) => Promise<void>
  range: (min: number, max: number | null) => string
  weightHint: string
  completedSets: SetLog[]
  completedReps: number
  saveError: string | null
  totalSets: number
  extraMakeupCount: number
  setKey: (elId: number, setNum: number, isMakeup?: boolean) => string
  getSets: (elId: number) => SetLog[]
  suggestedWeight: (elId: number, setNum: number) => string
  setWeight: Record<string, string>
  defaultWeight: (elId: number, setNum: number) => string
  setSetWeight: Dispatch<SetStateAction<Record<string, string>>>
  pending: boolean
  setQuantity: Record<string, string>
  setSetQuantity: Dispatch<SetStateAction<Record<string, string>>>
  saveSet: (elId: number, setNum: number, isMakeup?: boolean, missed?: boolean, addMakeup?: boolean) => void
  setMissModalKey: Dispatch<SetStateAction<string | null>>
  addSet: (elId: number) => void
  removeSet: (elId: number, setNum: number, isMakeup: boolean) => void
  setExRpe: Dispatch<SetStateAction<Record<number, string>>>
  exRpe: Record<number, string>
  exNotes: Record<number, string>
  setExNotes: Dispatch<SetStateAction<Record<number, string>>>
  saveExerciseNotes: (row: ExerciseLogRow) => void
}

export function WorkoutExerciseCard({
  te,
  currentRow,
  chosenNames,
  elId,
  setChosenNames,
  skipExercise,
  range,
  weightHint,
  completedSets,
  completedReps,
  saveError,
  totalSets,
  extraMakeupCount,
  setKey,
  getSets,
  suggestedWeight,
  setWeight,
  defaultWeight,
  setSetWeight,
  pending,
  setQuantity,
  setSetQuantity,
  saveSet,
  setMissModalKey,
  addSet,
  removeSet,
  setExRpe,
  exRpe,
  exNotes,
  setExNotes,
  saveExerciseNotes,
}: WorkoutExerciseCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{te?.section === "accessory" ? "Accessories" + (te.superset ? " / Superset: " + te.superset : "") : "Main exercises"}</p>
            {currentRow.el.exerciseId == null && <div className="space-y-2 mb-3">
              <p className="text-sm whitespace-pre-wrap">Free-pick criteria: {currentRow.el.freePickCriteria}</p>
              <Label htmlFor={"chosen-exercise-" + elId}>Exercise you chose</Label>
              <Input id={"chosen-exercise-" + elId} placeholder="Enter exercise name" value={chosenNames[elId] ?? currentRow.el.exerciseName ?? ""} onChange={(e) => setChosenNames((prev) => ({ ...prev, [elId]: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Saved with each set in this workout log.</p>
            </div>}
            <CardTitle className="text-lg">{currentRow.exercise?.name ?? chosenNames[elId] ?? currentRow.el.exerciseName ?? "Free-pick exercise"}</CardTitle>
            {te?.notes && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{te.notes}</p>}
            {currentRow.exercise?.muscleGroup && (
              <Badge variant="secondary" className="text-xs mt-1">{currentRow.exercise?.muscleGroup}</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground gap-1.5"
            disabled={pending || currentRow.el.skipped}
            onClick={() => skipExercise(currentRow)}
          >
            <SkipForward className="w-3.5 h-3.5" /> {currentRow.el.skipped ? "Skipped" : "Skip"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {te && <p className="text-sm text-muted-foreground">
          {range(te.setsMin, te.setsMax)} sets &times; {describeExerciseTarget(te)}
          {te.weightType === "fixed" && te.weightValue != null ? " - " + Number(te.weightValue) + " kg" : " - " + weightHint}
        </p>}
        {te && <div className="flex flex-wrap gap-2" aria-live="polite">
          {[{ label: "Sets", value: completedSets.length, min: te.setsMin, max: te.setsMax },
          ...(te.totalRepsMin == null ? [] : [{ label: "Total reps", value: completedReps, min: te.totalRepsMin, max: te.totalRepsMax }])].map((target) => {
            const status = rangeStatus(target.value, target.min, target.max)
            return <span key={target.label} className={cn("rounded-md border px-2 py-1 text-xs font-medium", status === "Within" ? "bg-green-500/10 text-green-700 dark:text-green-400" : status === "Above" ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
              {target.label}: {target.value} / {range(target.min, target.max)} - {status} target
            </span>
          })}
        </div>}
        {te && totalSets > (te.setsMax ?? te.setsMin) && <p role="status" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
          Sets: {totalSets} / {range(te.setsMin, te.setsMax)} prescribed (+{totalSets - (te.setsMax ?? te.setsMin)} extra)
        </p>}
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        <div className="space-y-2">
          {(() => {
            const savedSets = getSets(elId)
            let nextMakeup = 1
            const rows: { isMakeup: boolean; n: number }[] = []
            for (let n = 1; n <= totalSets; n++) {
              rows.push({ isMakeup: false, n })
              const workingSet = savedSets.find((set) => !set.isMakeup && set.setNumber === n)
              if (workingSet?.missed && nextMakeup <= extraMakeupCount) rows.push({ isMakeup: true, n: nextMakeup++ })
            }
            while (nextMakeup <= extraMakeupCount) rows.push({ isMakeup: true, n: nextMakeup++ })
            return rows.map(({ isMakeup, n }) => {
            const target = te ? exerciseTarget(te, isMakeup ? Infinity : n) : undefined
            const k = setKey(elId, n, isMakeup)
            const saved = savedSets.find((s) => s.setNumber === n && s.isMakeup === isMakeup)
            return (
              <div key={k} className={cn("rounded-lg border p-2 space-y-2", saved ? saved.missed ? "border-destructive/40 bg-destructive/5" : "border-primary/40 bg-primary/5" : "border-border")}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{isMakeup ? "Makeup set" : "Set"} {n}</span>
                  {!isMakeup && te?.weightType === "pb_percent" && percentageAt(te, n) && (
                    <span className="rounded-md border bg-muted px-2 py-1 text-xs font-medium">Target: {formatTarget(percentageAt(te, n)!)}% of PB{suggestedWeight(elId, n) ? " | " + suggestedWeight(elId, n) + " kg" : ""}</span>
                  )}
                  <Button variant="ghost" size="sm" disabled={pending} aria-label={"Remove " + (isMakeup ? "makeup set " : "set ") + n}
                    onClick={() => removeSet(elId, n, isMakeup)}>Remove</Button>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_auto_auto] items-end gap-1.5">
                  <div className="min-w-0 space-y-1">
                    <Label htmlFor={"weight-" + k} className="text-xs">Weight (kg)</Label>
                    <Input id={"weight-" + k} type="number" min={0} step="any" placeholder={suggestedWeight(elId, n) || "kg"} className="h-9 px-2"
                      value={setWeight[k] ?? saved?.weight ?? defaultWeight(elId, n)}
                      onChange={(e) => setSetWeight((prev) => ({ ...prev, [k]: e.target.value }))} disabled={pending} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={"reps-" + k} className="text-xs">{target?.timed ? "Seconds" : "Reps"}{target && !(isMakeup && te?.repsBySet?.length) ? " (" + range(target.min, target.max) + ")" : ""}</Label>
                    <Input id={"reps-" + k} type="number" min={0} step={1} placeholder={target?.timed ? "seconds" : "reps"} className="h-9 px-2"
                      value={setQuantity[k] ?? (target?.timed ? saved?.durationSeconds : saved?.reps)?.toString() ?? target?.min.toString() ?? ""}
                      onChange={(e) => setSetQuantity((prev) => ({ ...prev, [k]: e.target.value }))} disabled={pending} />
                  </div>
                  <Button size="sm" className="px-2" variant={saved && !saved.missed ? "default" : "outline"} disabled={pending}
                    onClick={() => saveSet(elId, n, isMakeup)}>Make</Button>
                  <Button size="sm" className="px-2" variant={saved?.missed ? "destructive" : "outline"} disabled={pending}
                    onClick={() => setMissModalKey(k)}>Miss</Button>
                </div>
              </div>
            )
          })})()}
          <Button variant="outline" size="sm" disabled={pending} onClick={() => addSet(elId)}>
            <Plus className="w-4 h-4" /> Add set ({totalSets})
          </Button>
        </div>

        <Separator />

        {/* Top set RPE */}
        <div className="space-y-2">
          <Label className="text-sm">Top set RPE</Label>
          <div className="flex gap-1.5 flex-wrap">
            {RPE_OPTIONS.map((v) => (
              <button
                key={v}
                onClick={() => setExRpe((prev) => ({ ...prev, [elId]: v }))}
                className={cn(
                  "px-2.5 h-8 rounded-lg text-xs font-medium border transition-colors",
                  (exRpe[elId] ?? currentRow.el.topSetRpe) === v
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise notes */}
        <div className="space-y-2">
          <Label className="text-sm flex items-center gap-1.5">
            <NotebookPen className="w-3.5 h-3.5" /> Notes
          </Label>
          <Textarea
            placeholder="How did this feel? Technique notes..."
            rows={2}
            value={exNotes[elId] ?? currentRow.el.notes ?? ""}
            onChange={(e) => setExNotes((prev) => ({ ...prev, [elId]: e.target.value }))}
            onBlur={() => saveExerciseNotes(currentRow)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
