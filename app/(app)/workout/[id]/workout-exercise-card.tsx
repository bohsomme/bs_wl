"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { SetLog, TemplateExercise } from "@/lib/db/schema"
import { formatTarget, percentageAt, rangeStatus } from "@/lib/prescription"
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
  successfulSets: SetLog[]
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
  setReps: Record<string, string>
  setSetReps: Dispatch<SetStateAction<Record<string, string>>>
  saveSet: (elId: number, setNum: number, isMakeup?: boolean, missed?: boolean, addMakeup?: boolean) => void
  setMissModalKey: Dispatch<SetStateAction<string | null>>
  setWorkingSets: Dispatch<SetStateAction<Record<number, number>>>
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
  successfulSets,
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
  setReps,
  setSetReps,
  saveSet,
  setMissModalKey,
  setWorkingSets,
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
          <div>
            <p className="text-xs text-muted-foreground">{te?.section === "accessory" ? "Accessories" + (te.superset ? " / Superset: " + te.superset : "") : "Main exercises"}</p>
            {currentRow.el.exerciseId == null && <div className="space-y-2 mb-3">
              <p className="text-sm whitespace-pre-wrap">Free-pick criteria: {currentRow.el.freePickCriteria}</p>
              <Label htmlFor="chosen-exercise">Exercise you chose</Label>
              <Input id="chosen-exercise" placeholder="Enter exercise name" value={chosenNames[elId] ?? currentRow.el.exerciseName ?? ""} onChange={(e) => setChosenNames((prev) => ({ ...prev, [elId]: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Saved with each set in this workout log.</p>
            </div>}
            <CardTitle className="text-lg">{currentRow.exercise?.name ?? chosenNames[elId] ?? currentRow.el.exerciseName ?? "Free-pick exercise"}</CardTitle>
            {currentRow.exercise?.muscleGroup && (
              <Badge variant="secondary" className="text-xs mt-1">{currentRow.exercise?.muscleGroup}</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5"
            onClick={() => skipExercise(currentRow)}
          >
            <SkipForward className="w-3.5 h-3.5" /> Skip
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {te && <p className="text-sm text-muted-foreground">
          {range(te.setsMin, te.setsMax)} sets &times; {range(te.repsMin, te.repsMax)} reps
          {te.weightType === "fixed" && te.weightValue != null ? " - " + Number(te.weightValue) + " kg" : " - " + weightHint}
        </p>}
        {te && <div className="flex flex-wrap gap-2" aria-live="polite">
          {[{ label: "Sets", value: successfulSets.filter((set) => !set.isMakeup).length, min: te.setsMin, max: te.setsMax },
          ...(te.totalRepsMin == null ? [] : [{ label: "Total reps", value: completedReps, min: te.totalRepsMin, max: te.totalRepsMax }])].map((target) => {
            const status = rangeStatus(target.value, target.min, target.max)
            return <span key={target.label} className={cn("rounded-md border px-2 py-1 text-xs font-medium", status === "Within" ? "bg-green-500/10 text-green-700 dark:text-green-400" : status === "Above" ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
              {target.label}: {target.value} / {range(target.min, target.max)} - {status} target
            </span>
          })}
        </div>}
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        <div className="space-y-2">
          {Array.from({ length: totalSets + extraMakeupCount }, (_, i) => {
            const isMakeup = i >= totalSets
            const n = isMakeup ? i - totalSets + 1 : i + 1
            const k = setKey(elId, n, isMakeup)
            const saved = getSets(elId).find((s) => s.setNumber === n && s.isMakeup === isMakeup)
            return (
              <div key={k} className={cn("rounded-lg border p-2 space-y-2", saved ? saved.missed ? "border-destructive/40 bg-destructive/5" : "border-primary/40 bg-primary/5" : "border-border")}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{isMakeup ? "Makeup set" : "Set"} {n}</span>
                  {te?.weightType === "pb_percent" && percentageAt(te, n) && (
                    <span className="rounded-md border bg-muted px-2 py-1 text-xs font-medium">Target: {formatTarget(percentageAt(te, n)!)}% of PB{suggestedWeight(elId, n) ? " | " + suggestedWeight(elId, n) + " kg" : ""}</span>
                  )}
                  {saved && <Badge variant={saved.missed ? "destructive" : "secondary"}>{saved.missed ? "Miss" : "Made"}</Badge>}
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_auto_auto] items-end gap-1.5">
                  <div className="min-w-0 space-y-1">
                    <Label htmlFor={"weight-" + k} className="text-xs">Weight (kg)</Label>
                    <Input id={"weight-" + k} type="number" min={0} step="any" placeholder={suggestedWeight(elId, n) || "kg"} className="h-9 px-2"
                      value={setWeight[k] ?? saved?.weight ?? defaultWeight(elId, n)}
                      onChange={(e) => setSetWeight((prev) => ({ ...prev, [k]: e.target.value }))} disabled={pending} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={"reps-" + k} className="text-xs">Reps{te ? " (" + range(te.repsMin, te.repsMax) + ")" : ""}</Label>
                    <Input id={"reps-" + k} type="number" min={0} step={1} placeholder="reps" className="h-9 px-2"
                      value={setReps[k] ?? saved?.reps?.toString() ?? te?.repsMin.toString() ?? ""}
                      onChange={(e) => setSetReps((prev) => ({ ...prev, [k]: e.target.value }))} disabled={pending} />
                  </div>
                  <Button size="sm" className="px-2" variant={saved && !saved.missed ? "default" : "outline"} disabled={pending}
                    onClick={() => saveSet(elId, n, isMakeup)}>Make</Button>
                  <Button size="sm" className="px-2" variant={saved?.missed ? "destructive" : "outline"} disabled={pending}
                    onClick={() => setMissModalKey(k)}>Miss</Button>
                </div>
              </div>
            )
          })}
          {(currentRow.el.exerciseId == null || (te?.setsMax != null && totalSets < te.setsMax)) && (
            <Button variant="outline" size="sm" onClick={() => setWorkingSets((prev) => ({ ...prev, [elId]: totalSets + 1 }))}>
              <Plus className="w-4 h-4" /> Add set ({totalSets}{te?.setsMax ? `/${te.setsMax}` : ""})
            </Button>
          )}
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
