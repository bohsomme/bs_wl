"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  updateWorkoutLog,
  addExerciseLog,
  updateExerciseLog,
  upsertSetLog,
} from "@/lib/actions/workouts"
import { addExercise } from "@/lib/actions/exercises"
import type { Exercise, WorkoutLog, ExerciseLog, SetLog, TemplateFunctionalBlock } from "@/lib/db/schema"
import { functionalHeading } from "@/lib/functional-fitness"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, SkipForward, Plus,
  AlertTriangle, NotebookPen, Dumbbell, Flag, Flame, Clock
} from "lucide-react"

type ExerciseLogRow = {
  el: ExerciseLog & { id: number; workoutLogId: number; exerciseId: number; orderIndex: number; topSetRpe: string | null; notes: string | null; skipped: boolean; createdAt: Date }
  exercise: Exercise
}

type WorkoutDetails = {
  log: WorkoutLog
  exerciseLogs: ExerciseLogRow[]
  prescriptionMap: Record<number, TemplateExercise>
  setsMap: Record<number, SetLog[]>
  functionalBlocks?: TemplateFunctionalBlock[]
}

interface WorkoutSessionProps {
  details: WorkoutDetails
  exercises: Exercise[]
  pbWeights: Record<number, string>
}

type Phase = "readiness" | "exercises" | "finish"

const RPE_OPTIONS = ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"]

export function WorkoutSession({ details: initialDetails, exercises, pbWeights }: WorkoutSessionProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [log] = useState(initialDetails.log)
  const [exerciseLogs, setExerciseLogs] = useState(initialDetails.exerciseLogs)
  const [setsMap, setSetsMap] = useState(initialDetails.setsMap)
  const functionalBlocks = initialDetails.functionalBlocks ?? []

  const [phase, setPhase] = useState<Phase>("readiness")
  const [currentExIdx, setCurrentExIdx] = useState(0)

  // Readiness phase state
  const [readiness, setReadiness] = useState(log.readiness != null && log.readiness <= 5 ? String(log.readiness) : "")
  const [barFeel, setBarFeel] = useState(log.barFeel != null && log.barFeel <= 5 ? String(log.barFeel) : "")
  const [preNotes, setPreNotes] = useState(log.preNotes ?? "")

  // Per-exercise state (keyed by exerciseLogId)
  const [exNotes, setExNotes] = useState<Record<number, string>>({})
  const [exRpe, setExRpe] = useState<Record<number, string>>({})

  // Per-set state (keyed by `${elId}-${setNum}-${isMakeup}`)
  const [setReps, setSetReps] = useState<Record<string, string>>({})
  const [setWeight, setSetWeight] = useState<Record<string, string>>({})
  const [workingSets, setWorkingSets] = useState<Record<number, number>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [missReason, setMissReason] = useState<Record<string, string>>({})
  const [makeupSets, setMakeupSets] = useState<Record<number, number>>({}) // elId -> count of makeup sets

  // Finish phase
  const [sessionRpe, setSessionRpe] = useState("")
  const [postNotes, setPostNotes] = useState("")

  // Add exercise dialog
  const [addExOpen, setAddExOpen] = useState(false)
  const [selectedAddExId, setSelectedAddExId] = useState<number | null>(null)
  const [newExOpen, setNewExOpen] = useState(false)
  const [newExName, setNewExName] = useState("")
  const [newExMuscle, setNewExMuscle] = useState("")
  const [localExercises, setLocalExercises] = useState(exercises)

  // Miss reason modal
  const [missModalKey, setMissModalKey] = useState<string | null>(null)

  const currentRow = exerciseLogs[currentExIdx]

  function setKey(elId: number, setNum: number, isMakeup = false) {
    return `${elId}-${setNum}-${isMakeup ? "m" : "w"}`
  }

  function getSets(elId: number) {
    return setsMap[elId] ?? []
  }

  function numSets(row: ExerciseLogRow) {
    // Use number from sets if saved, else derive from template (default 3)
    return Math.max(initialDetails.prescriptionMap[row.el.id]?.setsMin ?? 3, workingSets[row.el.id] ?? 0, ...getSets(row.el.id).filter((s) => !s.isMakeup).map((s) => s.setNumber))
  }

  const [checkInStatus, setCheckInStatus] = useState("")

  async function saveReadiness(beginWorkout = false) {
    startTransition(async () => {
      try {
      await updateWorkoutLog(log.id, {
        readiness: readiness ? Number(readiness) : undefined,
        barFeel: barFeel ? Number(barFeel) : undefined,
        preNotes,
      })
      setCheckInStatus("Saved")
      if (beginWorkout) setPhase("exercises")
      } catch {
        setCheckInStatus("Could not save. Please try again.")
      }
    })
  }

  function defaultWeight(elId: number) {
    const te = initialDetails.prescriptionMap[elId]
    if (te?.weightType === "fixed") return te.weightValue ?? ""
    const row = exerciseLogs.find((row) => row.el.id === elId)
    const pb = row ? pbWeights[row.exercise.id] : undefined
    if (te?.weightType !== "pb_percent" || te.weightValue == null || pb == null) return ""
    const weight = Number(pb) * Number(te.weightValue) / 100
    return Number.isFinite(weight) && weight >= 0 ? String(Number(weight.toFixed(2))) : ""
  }

  function saveSet(elId: number, setNum: number, isMakeup = false, missed = false, addMakeup = false) {
    const k = setKey(elId, setNum, isMakeup)
    const saved = getSets(elId).find((s) => s.setNumber === setNum && s.isMakeup === isMakeup)
    const te = initialDetails.prescriptionMap[elId]
    const reps = setReps[k] ?? saved?.reps?.toString() ?? te?.repsMin.toString() ?? ""
    const weight = setWeight[k] ?? saved?.weight ?? defaultWeight(elId)
    if ((reps !== "" && (!Number.isInteger(Number(reps)) || Number(reps) < 0)) ||
        (weight !== "" && (!Number.isFinite(Number(weight)) || Number(weight) < 0))) {
      setSaveError("Enter a valid weight and whole-number reps, both zero or greater.")
      return
    }
    startTransition(async () => {
      setSaveError(null)
      try {
        const result = await upsertSetLog({
          exerciseLogId: elId, setNumber: setNum, isMakeup,
          reps: reps === "" ? undefined : Number(reps),
          weight: weight === "" ? undefined : Number(weight),
          missed, missReason: missReason[k] ?? saved?.missReason ?? undefined,
        })
        setSetsMap((prev) => ({ ...prev, [elId]: [
          ...(prev[elId] ?? []).filter((s) => !(s.setNumber === setNum && s.isMakeup === isMakeup)), result,
        ] }))
        if (missed) setMissModalKey(null)
        if (addMakeup) addMakeupSet(elId)
      } catch {
        setSaveError("Could not save the set. Please try again.")
      }
    })
  }

  function addMakeupSet(elId: number) {
    const count = Math.max(0, ...getSets(elId).filter((s) => s.isMakeup).map((s) => s.setNumber))
    setMakeupSets((prev) => ({ ...prev, [elId]: Math.max(prev[elId] ?? 0, count) + 1 }))
  }

  async function skipExercise(row: ExerciseLogRow) {
    startTransition(async () => {
      await updateExerciseLog(row.el.id, { skipped: true })
      setExerciseLogs((prev) =>
        prev.map((r) => r.el.id === row.el.id ? { ...r, el: { ...r.el, skipped: true } } : r)
      )
      advanceExercise()
    })
  }

  function saveExerciseNotes(row: ExerciseLogRow) {
    const notes = exNotes[row.el.id]
    const rpe = exRpe[row.el.id]
    startTransition(async () => {
      await updateExerciseLog(row.el.id, {
        notes: notes || null,
        topSetRpe: rpe ? Number(rpe) : null,
      })
    })
  }

  function advanceExercise() {
    if (currentExIdx < exerciseLogs.length - 1) {
      setCurrentExIdx((i) => i + 1)
    } else {
      setPhase("finish")
    }
  }

  async function handleAddExercise() {
    if (!selectedAddExId) return
    startTransition(async () => {
      const el = await addExerciseLog({
        workoutLogId: log.id,
        exerciseId: selectedAddExId,
        orderIndex: exerciseLogs.length,
      })
      const ex = localExercises.find((e) => e.id === selectedAddExId)!
      setExerciseLogs((prev) => [...prev, { el: el as any, exercise: ex }])
      setSetsMap((prev) => ({ ...prev, [el.id]: [] }))
      setAddExOpen(false)
      setSelectedAddExId(null)
    })
  }

  async function handleCreateExercise() {
    if (!newExName.trim()) return
    startTransition(async () => {
      const ex = await addExercise({ name: newExName.trim(), muscleGroup: newExMuscle || undefined })
      setLocalExercises((prev) => [...prev, ex])
      setSelectedAddExId(ex.id)
      setNewExName("")
      setNewExMuscle("")
      setNewExOpen(false)
    })
  }

  async function finishWorkout() {
    startTransition(async () => {
      await updateWorkoutLog(log.id, {
        readiness: readiness ? Number(readiness) : undefined,
        barFeel: barFeel ? Number(barFeel) : undefined,
        preNotes,
        sessionRpe: sessionRpe ? Number(sessionRpe) : undefined,
        postNotes: postNotes || undefined,
        status: "completed",
        completedAt: new Date(),
      })
      router.push(`/log/${log.id}`)
    })
  }


  // ── Readiness Phase ──────────────────────────────────────────────────────

  const checkInPanel = (
    <section aria-label="Workout check-in" className="rounded-xl border bg-background p-3 shadow-sm space-y-2">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Readiness", value: readiness, setValue: setReadiness },
          { label: "Bar feel", value: barFeel, setValue: setBarFeel },
        ].map(({ label, value, setValue }) => (
          <fieldset key={label} className="min-w-0 space-y-1">
            <legend className="text-sm font-medium">{label} (1-5)</legend>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button key={rating} type="button" aria-label={label + ": " + rating + " out of 5"}
                  aria-pressed={value === String(rating)}
                  onClick={() => { setValue(String(rating)); setCheckInStatus("Unsaved changes") }}
                  className={cn("h-11 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    value === String(rating) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent")}
                >{rating}</button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor="workout-check-in-notes">Notes (optional)</Label>
        <Textarea id="workout-check-in-notes" placeholder="How are you feeling? Soreness, stress, sleep..."
          rows={2} className="field-sizing-fixed h-16 resize-none" value={preNotes}
          onChange={(e) => { setPreNotes(e.target.value); setCheckInStatus("Unsaved changes") }} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p role="status" className="text-xs text-muted-foreground">{checkInStatus}</p>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => saveReadiness()}>Save check-in</Button>
      </div>
    </section>
  )

  if (phase === "readiness") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{log.name}</h1>
            <p className="text-sm text-muted-foreground">Before you start</p>
          </div>
        </div>

        {checkInPanel}
        <Button onClick={() => saveReadiness(true)} disabled={pending} className="w-full gap-2">
          Start Workout <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  // ── Finish Phase ─────────────────────────────────────────────────────────

  if (phase === "finish") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setPhase("exercises")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Finish Workout</h1>
            <p className="text-sm text-muted-foreground">How did the session go?</p>
          </div>
        </div>

        {checkInPanel}

        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <Label>Session RPE</Label>
              <div className="flex gap-2 flex-wrap">
                {RPE_OPTIONS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setSessionRpe(v)}
                    className={cn(
                      "px-3 h-9 rounded-lg text-sm font-medium border transition-colors",
                      sessionRpe === v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Session notes (optional)</Label>
              <Textarea
                placeholder="How did the session feel overall? What went well? What to improve?"
                rows={4}
                value={postNotes}
                onChange={(e) => setPostNotes(e.target.value)}
              />
            </div>

            <Button onClick={finishWorkout} disabled={pending} className="w-full gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {pending ? "Saving..." : "Complete Workout"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Exercises Phase ──────────────────────────────────────────────────────

  if (!currentRow) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {functionalBlocks.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-primary" /> Functional Fitness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {functionalBlocks.map((b) => (
                <div key={b.id} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">{functionalHeading(b)}</span>
                    {b.source && <Badge variant="secondary" className="text-xs">{b.source}</Badge>}
                    {b.durationMin != null && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Clock className="w-3 h-3" /> {b.durationMin} min
                      </Badge>
                    )}
                  </div>
                  {b.details && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{b.details}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <div className="text-center py-8 space-y-3">
          <p className="font-medium">No strength exercises in this workout.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={() => setAddExOpen(true)}>Add Exercise</Button>
            <Button variant="outline" onClick={() => setPhase("finish")}>Finish Workout</Button>
          </div>
        </div>
      </div>
    )
  }

  const elId = currentRow.el.id
  const te = initialDetails.prescriptionMap[elId]
  const totalSets = numSets(currentRow)
  const extraMakeupCount = Math.max(makeupSets[elId] ?? 0, ...getSets(elId).filter((s) => s.isMakeup).map((s) => s.setNumber))
  const range = (min: number, max: number | null) => max != null && max !== min ? min + "-" + max : String(min)
  const weightHint = te?.weightType === "pb_percent"
    ? (te.weightValue == null ? "" : Number(te.weightValue)) + "% of PB"
    : te?.weightType === "rpe" ? "RPE " + (te.rpeTarget ?? "not set") : "kg"

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setPhase("readiness")}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{log.name}</h1>
          <p className="text-sm text-muted-foreground">
            Exercise {currentExIdx + 1} of {exerciseLogs.length}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddExOpen(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {checkInPanel}

      {/* Progress indicator */}
      <div className="flex gap-1">
        {exerciseLogs.map((r, i) => (
          <button
            key={r.el.id}
            onClick={() => { saveExerciseNotes(currentRow); setCurrentExIdx(i) }}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i === currentExIdx ? "bg-primary" :
              r.el.skipped ? "bg-muted-foreground/30" :
              i < currentExIdx ? "bg-primary/50" : "bg-border"
            )}
          />
        ))}
      </div>

      {/* Functional Fitness reference */}
      {functionalBlocks.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-primary" /> Functional Fitness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {functionalBlocks.map((b) => (
              <div key={b.id} className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{functionalHeading(b)}</span>
                  {b.source && <Badge variant="secondary" className="text-xs">{b.source}</Badge>}
                  {b.durationMin != null && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="w-3 h-3" /> {b.durationMin} min
                    </Badge>
                  )}
                </div>
                {b.details && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{b.details}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Exercise Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg">{currentRow.exercise.name}</CardTitle>
              {currentRow.exercise.muscleGroup && (
                <Badge variant="secondary" className="text-xs mt-1">{currentRow.exercise.muscleGroup}</Badge>
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
                    {te?.weightType === "pb_percent" && te.weightValue != null && (
                      <span className="rounded-md border bg-muted px-2 py-1 text-xs font-medium">Target: {Number(te.weightValue)}% of PB</span>
                    )}
                    {saved && <Badge variant={saved.missed ? "destructive" : "secondary"}>{saved.missed ? "Miss" : "Made"}</Badge>}
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_auto_auto] items-end gap-1.5">
                    <div className="min-w-0 space-y-1">
                      <Label htmlFor={"weight-" + k} className="text-xs">Weight (kg)</Label>
                      <Input id={"weight-" + k} type="number" min={0} step="0.5" placeholder="kg" className="h-9 px-2"
                        value={setWeight[k] ?? saved?.weight ?? defaultWeight(elId)}
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
            {te?.setsMax != null && totalSets < te.setsMax && (
              <Button variant="outline" size="sm" onClick={() => setWorkingSets((prev) => ({ ...prev, [elId]: totalSets + 1 }))}>
                <Plus className="w-4 h-4" /> Add set ({totalSets}/{te.setsMax})
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
                    exRpe[elId] === v
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
              value={exNotes[elId] ?? ""}
              onChange={(e) => setExNotes((prev) => ({ ...prev, [elId]: e.target.value }))}
              onBlur={() => saveExerciseNotes(currentRow)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => { saveExerciseNotes(currentRow); setCurrentExIdx((i) => Math.max(0, i - 1)) }}
          disabled={currentExIdx === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        {currentExIdx < exerciseLogs.length - 1 ? (
          <Button
            onClick={() => { saveExerciseNotes(currentRow); advanceExercise() }}
            className="gap-1.5"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={() => { saveExerciseNotes(currentRow); setPhase("finish") }}
            className="gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Finish
          </Button>
        )}
      </div>

      {/* Miss reason modal */}
      <Dialog open={!!missModalKey} onOpenChange={(open) => { if (!open) setMissModalKey(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Set missed
            </DialogTitle>
            <DialogDescription>
              Optionally add a reason for the miss. You can also add a makeup set.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g. Form breakdown, too heavy..."
                value={missModalKey ? (missReason[missModalKey] ?? "") : ""}
                onChange={(e) => {
                  if (!missModalKey) return
                  setMissReason((prev) => ({ ...prev, [missModalKey]: e.target.value }))
                }}
              />
            </div>
          </div>
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (missModalKey) {
                  const parts = missModalKey.split("-")
                  const elId = Number(parts[0])
                  const setNum = Number(parts[1])
                  saveSet(elId, setNum, parts[2] === "m", true)
                }
              }}
            >
              Save Miss
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                if (missModalKey) {
                  const parts = missModalKey.split("-")
                  const elId = Number(parts[0])
                  const setNum = Number(parts[1])
                  saveSet(elId, setNum, parts[2] === "m", true, true)
                }
              }}
            >
              Save &amp; Add Makeup Set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Exercise Dialog */}
      <Dialog open={addExOpen} onOpenChange={setAddExOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
            <DialogDescription>Add an exercise to this workout session.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Exercise</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedAddExId ? String(selectedAddExId) : ""}
                  onValueChange={(v) => setSelectedAddExId(Number(v))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select exercise..." />
                  </SelectTrigger>
                  <SelectContent>
                    {localExercises.map((ex) => (
                      <SelectItem key={ex.id} value={String(ex.id)}>{ex.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setNewExOpen(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddExOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExercise} disabled={pending || !selectedAddExId}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Exercise Dialog */}
      <Dialog open={newExOpen} onOpenChange={setNewExOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Exercise</DialogTitle>
            <DialogDescription>Add a new exercise to the global library.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Bulgarian Split Squat" value={newExName} onChange={(e) => setNewExName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Muscle group (optional)</Label>
              <Input placeholder="e.g. Legs" value={newExMuscle} onChange={(e) => setNewExMuscle(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewExOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateExercise} disabled={pending || !newExName.trim()}>Add Exercise</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
