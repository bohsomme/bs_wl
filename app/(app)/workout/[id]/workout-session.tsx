"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  updateWorkoutLog,
  addExerciseLog,
  updateExerciseLog,
  upsertSetLog,
  getSetLogs,
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
  setsMap: Record<number, SetLog[]>
  functionalBlocks?: TemplateFunctionalBlock[]
}

interface WorkoutSessionProps {
  details: WorkoutDetails
  exercises: Exercise[]
}

type Phase = "readiness" | "exercises" | "finish"

const RPE_OPTIONS = ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"]

export function WorkoutSession({ details: initialDetails, exercises }: WorkoutSessionProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [log] = useState(initialDetails.log)
  const [exerciseLogs, setExerciseLogs] = useState(initialDetails.exerciseLogs)
  const [setsMap, setSetsMap] = useState(initialDetails.setsMap)
  const functionalBlocks = initialDetails.functionalBlocks ?? []

  const [phase, setPhase] = useState<Phase>("readiness")
  const [currentExIdx, setCurrentExIdx] = useState(0)

  // Readiness phase state
  const [readiness, setReadiness] = useState(log.readiness?.toString() ?? "")
  const [barFeel, setBarFeel] = useState(log.barFeel?.toString() ?? "")
  const [preNotes, setPreNotes] = useState(log.preNotes ?? "")

  // Per-exercise state (keyed by exerciseLogId)
  const [exNotes, setExNotes] = useState<Record<number, string>>({})
  const [exRpe, setExRpe] = useState<Record<number, string>>({})

  // Per-set state (keyed by `${elId}-${setNum}-${isMakeup}`)
  const [setReps, setSetReps] = useState<Record<string, string>>({})
  const [setWeight, setSetWeight] = useState<Record<string, string>>({})
  const [setMissed, setSetMissed] = useState<Record<string, boolean>>({})
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
    return Math.max(getSets(row.el.id).filter((s) => !s.isMakeup).length, 3)
  }

  async function saveReadiness() {
    startTransition(async () => {
      await updateWorkoutLog(log.id, {
        readiness: readiness ? Number(readiness) : undefined,
        barFeel: barFeel ? Number(barFeel) : undefined,
        preNotes: preNotes || undefined,
      })
      setPhase("exercises")
    })
  }

  async function saveSet(elId: number, setNum: number, isMakeup = false) {
    const k = setKey(elId, setNum, isMakeup)
    const missed = setMissed[k] ?? false
    startTransition(async () => {
      await upsertSetLog({
        exerciseLogId: elId,
        setNumber: setNum,
        isMakeup,
        reps: setReps[k] ? Number(setReps[k]) : undefined,
        weight: setWeight[k] ? Number(setWeight[k]) : undefined,
        missed,
        missReason: missReason[k] || undefined,
      })
    })
  }

  function markMissed(elId: number, setNum: number) {
    const k = setKey(elId, setNum)
    setSetMissed((prev) => ({ ...prev, [k]: true }))
    setMissModalKey(k)
  }

  function addMakeupSet(elId: number) {
    setMakeupSets((prev) => ({ ...prev, [elId]: (prev[elId] ?? 0) + 1 }))
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
        sessionRpe: sessionRpe ? Number(sessionRpe) : undefined,
        postNotes: postNotes || undefined,
        status: "completed",
        completedAt: new Date(),
      })
      router.push(`/log/${log.id}`)
    })
  }

  const allDone = exerciseLogs.every((r) => r.el.skipped)

  // ── Readiness Phase ──────────────────────────────────────────────────────

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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How are you feeling today?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Readiness (1–10)</Label>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((v) => (
                  <button
                    key={v}
                    onClick={() => setReadiness(v)}
                    className={cn(
                      "w-9 h-9 rounded-lg text-sm font-medium border transition-colors",
                      readiness === v
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
              <Label>Bar feel (1–10)</Label>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((v) => (
                  <button
                    key={v}
                    onClick={() => setBarFeel(v)}
                    className={cn(
                      "w-9 h-9 rounded-lg text-sm font-medium border transition-colors",
                      barFeel === v
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
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="How are you feeling? Any soreness, stress, sleep..."
                rows={3}
                value={preNotes}
                onChange={(e) => setPreNotes(e.target.value)}
              />
            </div>

            <Button onClick={saveReadiness} disabled={pending} className="w-full gap-2">
              Start Workout <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
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
  const sets = getSets(elId).filter((s) => !s.isMakeup)
  const makeups = getSets(elId).filter((s) => s.isMakeup)
  const totalSets = Math.max(sets.length, numSets(currentRow))
  const extraMakeupCount = makeupSets[elId] ?? 0

  const hasMiss = Array.from({ length: totalSets }, (_, i) => i + 1).some(
    (n) => setMissed[setKey(elId, n)]
  )

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
          {/* Sets table */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 text-xs text-muted-foreground font-medium px-1 gap-2">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Weight (kg)</span>
              <span className="col-span-3">Reps</span>
              <span className="col-span-4">Actions</span>
            </div>
            {Array.from({ length: totalSets }, (_, i) => {
              const n = i + 1
              const k = setKey(elId, n)
              const missed = setMissed[k] ?? false
              return (
                <div
                  key={n}
                  className={cn(
                    "grid grid-cols-12 items-center gap-2 px-1 py-1 rounded-lg",
                    missed ? "bg-destructive/10" : ""
                  )}
                >
                  <span className="col-span-1 text-sm text-muted-foreground">{n}</span>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="kg"
                      value={setWeight[k] ?? ""}
                      onChange={(e) => setSetWeight((prev) => ({ ...prev, [k]: e.target.value }))}
                      onBlur={() => saveSet(elId, n)}
                      disabled={missed}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="reps"
                      value={setReps[k] ?? ""}
                      onChange={(e) => setSetReps((prev) => ({ ...prev, [k]: e.target.value }))}
                      onBlur={() => saveSet(elId, n)}
                      disabled={missed}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-4 flex gap-1">
                    {!missed ? (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 border-destructive/50 hover:bg-destructive/10 text-destructive"
                        onClick={() => markMissed(elId, n)}
                        title="Mark as missed"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Badge variant="destructive" className="text-xs">Miss</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => addMakeupSet(elId)}
                          title="Add makeup set"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Makeup sets */}
            {Array.from({ length: extraMakeupCount }, (_, i) => {
              const n = i + 1
              const k = setKey(elId, n, true)
              return (
                <div key={`makeup-${n}`} className="grid grid-cols-12 items-center gap-2 px-1 py-1 rounded-lg bg-primary/5">
                  <span className="col-span-1 text-xs text-primary font-bold">+{n}</span>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="kg"
                      value={setWeight[k] ?? ""}
                      onChange={(e) => setSetWeight((prev) => ({ ...prev, [k]: e.target.value }))}
                      onBlur={() => saveSet(elId, n, true)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="reps"
                      value={setReps[k] ?? ""}
                      onChange={(e) => setSetReps((prev) => ({ ...prev, [k]: e.target.value }))}
                      onBlur={() => saveSet(elId, n, true)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="col-span-4">
                    <Badge className="text-xs">Makeup</Badge>
                  </div>
                </div>
              )
            })}
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
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (missModalKey) {
                  const parts = missModalKey.split("-")
                  const elId = Number(parts[0])
                  const setNum = Number(parts[1])
                  saveSet(elId, setNum)
                }
                setMissModalKey(null)
              }}
            >
              Save
            </Button>
            <Button
              onClick={() => {
                if (missModalKey) {
                  const parts = missModalKey.split("-")
                  const elId = Number(parts[0])
                  const setNum = Number(parts[1])
                  saveSet(elId, setNum)
                  addMakeupSet(elId)
                }
                setMissModalKey(null)
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
