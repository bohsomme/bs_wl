"use client"
import { NewExerciseDialog } from "@/components/new-exercise-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatTarget } from "@/lib/prescription"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  ChevronLeft, ChevronRight,
  Plus
} from "lucide-react"
import { AddSessionExerciseDialog } from "./add-session-exercise-dialog"
import { FunctionalNotesField } from "./functional-notes-field"
import { FunctionalWorkoutCard } from "./functional-workout-card"
import { MissedSetDialog } from "./missed-set-dialog"
import { useWorkoutSession } from "./use-workout-session"
import { WorkoutCheckIn } from "./workout-check-in"
import { WorkoutExerciseCard } from "./workout-exercise-card"
import type { WorkoutSessionProps } from "./workout-types"

const RPE_OPTIONS = ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"]

export function WorkoutSession({ details: initialDetails, exercises, pbWeights }: WorkoutSessionProps) {
  const {
    router,
    pending,
    log,
    exerciseLogs,
    functionalBlocks,
    functionalNotes,
    setFunctionalNotes,
    functionalNotesStatus,
    setFunctionalNotesStatus,
    phase,
    setPhase,
    currentExIdx,
    setCurrentExIdx,
    readiness,
    setReadiness,
    barFeel,
    setBarFeel,
    preNotes,
    setPreNotes,
    chosenNames,
    setChosenNames,
    exNotes,
    setExNotes,
    exRpe,
    setExRpe,
    setReps,
    setSetReps,
    setWeight,
    setSetWeight,
    setWorkingSets,
    saveError,
    missReason,
    setMissReason,
    makeupSets,
    sessionRpe,
    setSessionRpe,
    postNotes,
    setPostNotes,
    addExOpen,
    setAddExOpen,
    selectedAddExId,
    setSelectedAddExId,
    newExOpen,
    setNewExOpen,
    newExName,
    setNewExName,
    newExMuscle,
    setNewExMuscle,
    localExercises,
    missModalKey,
    setMissModalKey,
    currentRow,
    setKey,
    getSets,
    numSets,
    checkInStatus,
    setCheckInStatus,
    saveReadiness,
    suggestedWeight,
    defaultWeight,
    saveSet,
    skipExercise,
    saveExerciseNotes,
    advanceExercise,
    handleAddExercise,
    handleCreateExercise,
    finishWorkout,
    saveFunctionalNotes,
  } = useWorkoutSession({ details: initialDetails, exercises, pbWeights })

  const functionalNotesField = (
    <FunctionalNotesField
      functionalNotes={functionalNotes}
      setFunctionalNotes={setFunctionalNotes}
      setFunctionalNotesStatus={setFunctionalNotesStatus}
      saveFunctionalNotes={saveFunctionalNotes}
      functionalNotesStatus={functionalNotesStatus}
      pending={pending}
    />
  )

  const checkInPanel = (
    <WorkoutCheckIn
      readiness={readiness}
      setReadiness={setReadiness}
      barFeel={barFeel}
      setBarFeel={setBarFeel}
      setCheckInStatus={setCheckInStatus}
      preNotes={preNotes}
      setPreNotes={setPreNotes}
      checkInStatus={checkInStatus}
      pending={pending}
      saveReadiness={saveReadiness}
    />
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

            {functionalBlocks.length > 0 && functionalNotesField}

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
          <FunctionalWorkoutCard blocks={functionalBlocks}>{functionalNotesField}</FunctionalWorkoutCard>
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
  const successfulSets = getSets(elId).filter((set) => !set.missed)
  const completedReps = successfulSets.reduce((sum, set) => sum + (set.reps ?? 0), 0)
  const weightHint = te?.weightType === "pb_percent"
    ? (te.percentages?.map(formatTarget).join(", ") ?? te.weightValue ?? "") + "% of PB"
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

      {/* Exercise Card */}
      <WorkoutExerciseCard
        te={te}
        currentRow={currentRow}
        chosenNames={chosenNames}
        elId={elId}
        setChosenNames={setChosenNames}
        skipExercise={skipExercise}
        range={range}
        weightHint={weightHint}
        successfulSets={successfulSets}
        completedReps={completedReps}
        saveError={saveError}
        totalSets={totalSets}
        extraMakeupCount={extraMakeupCount}
        setKey={setKey}
        getSets={getSets}
        suggestedWeight={suggestedWeight}
        setWeight={setWeight}
        defaultWeight={defaultWeight}
        setSetWeight={setSetWeight}
        pending={pending}
        setReps={setReps}
        setSetReps={setSetReps}
        saveSet={saveSet}
        setMissModalKey={setMissModalKey}
        setWorkingSets={setWorkingSets}
        setExRpe={setExRpe}
        exRpe={exRpe}
        exNotes={exNotes}
        setExNotes={setExNotes}
        saveExerciseNotes={saveExerciseNotes}
      />

      {exerciseLogs.some((row) => initialDetails.prescriptionMap[row.el.id]?.section === "accessory") && <section className="space-y-2">
        <h2 className="font-semibold">Accessories</h2>
        {Array.from(new Set(exerciseLogs.filter((row) => initialDetails.prescriptionMap[row.el.id]?.section === "accessory").map((row) => initialDetails.prescriptionMap[row.el.id].superset ?? ""))).map((group) => <div key={group} className="rounded-lg border p-3 space-y-2">
          {group && <p className="text-sm font-medium">Superset: {group} - alternate exercises each round</p>}
          {exerciseLogs.map((row, index) => {
            const prescription = initialDetails.prescriptionMap[row.el.id]
            if (prescription?.section !== "accessory" || (prescription.superset ?? "") !== group) return null
            return <button key={row.el.id} type="button" onClick={() => { saveExerciseNotes(currentRow); setCurrentExIdx(index) }} className={cn("block w-full rounded-md p-2 text-left hover:bg-accent", index === currentExIdx && "bg-accent")}>
              <p className="text-sm font-medium">{row.exercise?.name ?? chosenNames[row.el.id] ?? row.el.exerciseName ?? "Free-pick exercise"}</p>
              <p className="text-xs text-muted-foreground">{range(prescription.setsMin, prescription.setsMax)} sets &times; {range(prescription.repsMin, prescription.repsMax)} reps{prescription.rpeTarget ? " | RPE " + prescription.rpeTarget : ""} | {getSets(row.el.id).filter((set) => !set.missed).length} sets saved</p>
            </button>
          })}
        </div>)}
      </section>}

      {/* Functional Fitness reference */}
      {functionalBlocks.length > 0 && (
        <FunctionalWorkoutCard blocks={functionalBlocks}>{functionalNotesField}</FunctionalWorkoutCard>
      )}

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
      <MissedSetDialog
        missModalKey={missModalKey}
        setMissModalKey={setMissModalKey}
        missReason={missReason}
        setMissReason={setMissReason}
        saveError={saveError}
        pending={pending}
        saveSet={saveSet}
      />

      {/* Add Exercise Dialog */}
      <AddSessionExerciseDialog
        addExOpen={addExOpen}
        setAddExOpen={setAddExOpen}
        localExercises={localExercises}
        selectedAddExId={selectedAddExId}
        setSelectedAddExId={setSelectedAddExId}
        setNewExOpen={setNewExOpen}
        handleAddExercise={handleAddExercise}
        pending={pending}
      />

      {/* New Exercise Dialog */}
      <NewExerciseDialog
        newExOpen={newExOpen}
        setNewExOpen={setNewExOpen}
        newExName={newExName}
        setNewExName={setNewExName}
        newExMuscle={newExMuscle}
        setNewExMuscle={setNewExMuscle}
        handleCreateExercise={handleCreateExercise}
        pending={pending}
      />
    </div>
  )
}
