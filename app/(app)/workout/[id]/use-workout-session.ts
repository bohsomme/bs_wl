"use client"
import { addExercise } from "@/lib/actions/exercises"
import {
  addExerciseLog,
  updateExerciseLog,
  updateWorkoutLog,
  upsertSetLog,
} from "@/lib/actions/workouts"
import { percentageAt, weightTarget } from "@/lib/prescription"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import type { ExerciseLogRow, Phase, WorkoutSessionProps } from "./workout-types"

export function useWorkoutSession({ details: initialDetails, exercises, pbWeights }: WorkoutSessionProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [log] = useState(initialDetails.log)
  const [exerciseLogs, setExerciseLogs] = useState([...initialDetails.exerciseLogs].sort((a, b) => Number(initialDetails.prescriptionMap[a.el.id]?.section === "accessory") - Number(initialDetails.prescriptionMap[b.el.id]?.section === "accessory")))
  const [setsMap, setSetsMap] = useState(initialDetails.setsMap)
  const functionalBlocks = initialDetails.functionalBlocks ?? []
  const [functionalNotes, setFunctionalNotes] = useState(log.functionalNotes ?? "")
  const [functionalNotesStatus, setFunctionalNotesStatus] = useState("")

  const [phase, setPhase] = useState<Phase>("readiness")
  const [currentExIdx, setCurrentExIdx] = useState(0)

  // Readiness phase state
  const [readiness, setReadiness] = useState(log.readiness != null && log.readiness <= 5 ? String(log.readiness) : "")
  const [barFeel, setBarFeel] = useState(log.barFeel != null && log.barFeel <= 5 ? String(log.barFeel) : "")
  const [preNotes, setPreNotes] = useState(log.preNotes ?? "")

  // Per-exercise state (keyed by exerciseLogId)
  const [chosenNames, setChosenNames] = useState<Record<number, string>>({})
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

  function suggestedWeight(elId: number, setNum: number) {
    const te = initialDetails.prescriptionMap[elId]
    if (te?.weightType === "fixed") return te.weightValue ?? ""
    const row = exerciseLogs.find((row) => row.el.id === elId)
    const pb = row?.exercise ? pbWeights[row.exercise.id] : undefined
    if (te?.weightType !== "pb_percent" || pb == null) return ""
    const target = percentageAt(te, setNum)
    return target ? weightTarget(target, Number(pb)) : ""
  }

  function defaultWeight(elId: number, setNum: number) {
    const hint = suggestedWeight(elId, setNum)
    return hint.includes("-") ? "" : hint
  }

  function saveSet(elId: number, setNum: number, isMakeup = false, missed = false, addMakeup = false) {
    const k = setKey(elId, setNum, isMakeup)
    const saved = getSets(elId).find((s) => s.setNumber === setNum && s.isMakeup === isMakeup)
    const te = initialDetails.prescriptionMap[elId]
    const reps = setReps[k] ?? saved?.reps?.toString() ?? te?.repsMin.toString() ?? ""
    const weight = setWeight[k] ?? saved?.weight ?? defaultWeight(elId, setNum)
    const target = te?.weightType === "pb_percent" ? percentageAt(te, setNum) : undefined
    if (!missed && target?.max != null && target.max !== target.min && weight.trim() === "") {
      setSaveError("Enter one weight in kg before saving this set.")
      return
    }
    if ((reps !== "" && (!Number.isInteger(Number(reps)) || Number(reps) < 0)) ||
      (weight !== "" && (!Number.isFinite(Number(weight)) || Number(weight) < 0))) {
      setSaveError("Enter a valid weight and whole-number reps, both zero or greater.")
      return
    }
    startTransition(async () => {
      setSaveError(null)
      try {
        const result = await upsertSetLog({
          exerciseName: chosenNames[elId] ?? exerciseLogs.find((row) => row.el.id === elId)?.el.exerciseName ?? undefined,
          exerciseLogId: elId, setNumber: setNum, isMakeup,
          reps: reps === "" ? undefined : Number(reps),
          weight: weight === "" ? undefined : Number(weight),
          missed, missReason: missReason[k] ?? saved?.missReason ?? undefined,
        })
        setSetsMap((prev) => ({
          ...prev, [elId]: [
            ...(prev[elId] ?? []).filter((s) => !(s.setNumber === setNum && s.isMakeup === isMakeup)), result,
          ]
        }))
        if (missed) setMissModalKey(null)
        if (addMakeup) addMakeupSet(elId)
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Could not save the set. Please try again.")
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
    const notes = exNotes[row.el.id] ?? row.el.notes
    const rpe = exRpe[row.el.id] ?? row.el.topSetRpe
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
        functionalNotes,
        status: "completed",
        completedAt: new Date(),
      })
      router.push(`/log/${log.id}`)
    })
  }

  // ── Readiness Phase ──────────────────────────────────────────────────────

  function saveFunctionalNotes() {
    startTransition(async () => {
      try {
        await updateWorkoutLog(log.id, { functionalNotes })
        setFunctionalNotesStatus("Saved")
      } catch {
        setFunctionalNotesStatus("Could not save. Please try again.")
      }
    })
  }

  return {
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
  }
}
