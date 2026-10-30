"use client"
import { addExercise } from "@/lib/actions/exercises"
import {
  changeProgramWeeks,
  updateWorkoutTemplate,
  addFunctionalBlock,
  addTemplateExercise,
  createWorkoutTemplate,
  deleteFunctionalBlock,
  deleteTemplateExercise,
  deleteWorkoutTemplate,
  duplicateWorkoutTemplate,
  getFunctionalBlocks,
  getTemplateExercises,
  updateTemplateExercise,
  updateFunctionalBlock,
  reorderTemplateExercises,
} from "@/lib/actions/programs"
import type { TemplateExercise, TemplateFunctionalBlock, WorkoutTemplate } from "@/lib/db/schema"
import { type FunctionalKind } from "@/lib/functional-fitness"
import { formatTarget, parsePercentages, parseRepsBySet } from "@/lib/prescription"
import { moveTemplateExercise } from "@/lib/template-exercise-order"
import { useState, useTransition } from "react"
import type { ProgramBuilderProps, TemplateExerciseRow } from "./program-types"

export function useProgramBuilder({ program, initialTemplates, exercises: initialExercises }: ProgramBuilderProps) {
  const [totalWeeks, setTotalWeeks] = useState(program.totalWeeks)
  const [scheduleError, setScheduleError] = useState("")
  const [newRestDay, setNewRestDay] = useState(false)
  const [templates, setTemplates] = useState(initialTemplates)
  const [exercises, setExercises] = useState(initialExercises)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [templateExercises, setTemplateExercises] = useState<TemplateExerciseRow[]>([])
  const [functionalBlocks, setFunctionalBlocks] = useState<TemplateFunctionalBlock[]>([])
  const [pending, startTransition] = useTransition()

  // Duplicate day dialog
  const [dupOpen, setDupOpen] = useState(false)
  const [dupWeek, setDupWeek] = useState(1)
  const [dupDay, setDupDay] = useState(1)

  // Functional Fitness dialog
  const [ffOpen, setFfOpen] = useState(false)
  const [editingFunctionalBlock, setEditingFunctionalBlock] = useState<TemplateFunctionalBlock | null>(null)
  const [ffError, setFfError] = useState("")
  const [ffKind, setFfKind] = useState<FunctionalKind>("metcon")
  const [ffTitle, setFfTitle] = useState("")
  const [ffSource, setFfSource] = useState("")
  const [ffDetails, setFfDetails] = useState("")
  const [ffDuration, setFfDuration] = useState("")

  // New template form
  const [newTemplateWarmup, setNewTemplateWarmup] = useState("")
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateWeek, setNewTemplateWeek] = useState(1)
  const [newTemplateDay, setNewTemplateDay] = useState(1)
  const [addTemplateOpen, setAddTemplateOpen] = useState(false)

  // Add exercise to template
  const [addExOpen, setAddExOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<TemplateExercise | null>(null)
  const [selectedExId, setSelectedExId] = useState<number | null>(null)
  const [freePick, setFreePick] = useState(false)
  const [freePickCriteria, setFreePickCriteria] = useState("")
  const [setsMin, setSetsMin] = useState("3")
  const [setsMax, setSetsMax] = useState("")
  const [targetType, setTargetType] = useState("reps")
  const [repsMin, setRepsMin] = useState("5")
  const [repsMax, setRepsMax] = useState("")
  const [repsBySetText, setRepsBySetText] = useState("5, 3, 1")
  const [weightType, setWeightType] = useState("fixed")
  const [weightValue, setWeightValue] = useState("")
  const [rpeTarget, setRpeTarget] = useState("")
  const [exNotes, setExNotes] = useState("")

  const [section, setSection] = useState("main")
  const [superset, setSuperset] = useState("")
  const [percentText, setPercentText] = useState("")
  const [totalRepsMin, setTotalRepsMin] = useState("")
  const [totalRepsMax, setTotalRepsMax] = useState("")
  const [exerciseError, setExerciseError] = useState("")

  // New exercise form
  const [newExOpen, setNewExOpen] = useState(false)
  const [newExName, setNewExName] = useState("")
  const [newExMuscle, setNewExMuscle] = useState("")

  async function handleSaveWarmup(id: number, warmup: string) {
    const updated = await updateWorkoutTemplate(id, { warmup })
    setTemplates((prev) => prev.map((template) => template.id === id ? updated : template))
    setSelectedTemplate((prev) => prev?.id === id ? updated : prev)
  }

  function selectTemplate(t: WorkoutTemplate) {
    setSelectedTemplate(t)
    startTransition(async () => {
      const [rows, blocks] = await Promise.all([
        getTemplateExercises(t.id),
        getFunctionalBlocks(t.id),
      ])
      setTemplateExercises(rows as TemplateExerciseRow[])
      setFunctionalBlocks(blocks)
    })
  }

  function handleDuplicateDay() {
    if (!selectedTemplate) return
    startTransition(async () => {
      try {
      const t = await duplicateWorkoutTemplate({
        templateId: selectedTemplate.id,
        targetWeek: dupWeek,
        targetDay: dupDay,
        programId: program.id,
      })
      setTemplates((prev) => [...prev, t])
      setDupOpen(false)
      setScheduleError("")
      } catch (error) { setScheduleError(error instanceof Error ? error.message : "Could not duplicate day.") }
    })
  }

  function handleAddFunctionalBlock() {
    if (!selectedTemplate) return
    if (ffKind === "custom" && !ffTitle.trim()) return
    startTransition(async () => {
      try {
      const data = {
        kind: ffKind,
        title: ffTitle.trim() || null,
        source: ffSource.trim() || null,
        details: ffDetails.trim() || null,
        durationMin: ffDuration ? Number(ffDuration) : null,
      }
      if (data.durationMin != null && (!Number.isInteger(data.durationMin) || data.durationMin < 1)) throw new Error("Enter a positive whole number of minutes.")
      const block = editingFunctionalBlock
        ? await updateFunctionalBlock(editingFunctionalBlock.id, data)
        : await addFunctionalBlock({ ...data, workoutTemplateId: selectedTemplate.id,
          title: data.title ?? undefined, source: data.source ?? undefined, details: data.details ?? undefined,
          durationMin: data.durationMin ?? undefined,
          orderIndex: Math.max(-1, ...functionalBlocks.map((b) => b.orderIndex)) + 1 })
      setFunctionalBlocks((prev) => editingFunctionalBlock ? prev.map((b) => b.id === block.id ? block : b) : [...prev, block])
      resetFfForm()
      setFfOpen(false)
      } catch (error) { setFfError(error instanceof Error ? error.message : "Could not save functional work.") }
    })
  }

  function handleRemoveFunctionalBlock(id: number) {
    startTransition(async () => {
      await deleteFunctionalBlock(id)
      setFunctionalBlocks((prev) => prev.filter((b) => b.id !== id))
    })
  }

  function resetFfForm() {
    setEditingFunctionalBlock(null)
    setFfError("")
    setFfKind("metcon")
    setFfTitle("")
    setFfSource("")
    setFfDetails("")
    setFfDuration("")
  }

  function handleEditFunctionalBlock(block: TemplateFunctionalBlock) {
    resetFfForm()
    setEditingFunctionalBlock(block)
    setFfKind(block.kind as FunctionalKind)
    setFfTitle(block.title ?? "")
    setFfSource(block.source ?? "")
    setFfDetails(block.details ?? "")
    setFfDuration(block.durationMin == null ? "" : String(block.durationMin))
    setFfOpen(true)
  }

  function handleMoveExercise(id: number, direction: -1 | 1) {
    if (!selectedTemplate) return
    const row = templateExercises.find((row) => row.te.id === id)
    if (!row) return
    const ids = moveTemplateExercise(templateExercises, id, direction)
    if (!ids) return
    startTransition(async () => {
      try {
        await reorderTemplateExercises(selectedTemplate.id, row.te.section, ids)
        setTemplateExercises(await getTemplateExercises(selectedTemplate.id))
        setScheduleError("")
      } catch (error) { setScheduleError(error instanceof Error ? error.message : "Could not reorder exercises.") }
    })
  }

  function handleAddTemplate() {
    if (!newRestDay && !newTemplateName.trim()) return
    startTransition(async () => {
      try {
      const t = await createWorkoutTemplate({
        programId: program.id,
        name: newRestDay ? "Rest day" : newTemplateName.trim(),
        warmup: newRestDay ? undefined : newTemplateWarmup,
        isRestDay: newRestDay,
        weekNumber: newTemplateWeek,
        dayNumber: newTemplateDay,
      })
      setTemplates((prev) => [...prev, t])
      setNewTemplateName("")
      setNewTemplateWarmup("")
      setAddTemplateOpen(false)
      setScheduleError("")
      } catch (error) { setScheduleError(error instanceof Error ? error.message : "Could not add day.") }
    })
  }

  function handleDeleteTemplate(id: number) {
    startTransition(async () => {
      await deleteWorkoutTemplate(id, program.id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null)
        setTemplateExercises([])
      }
    })
  }

  const validCount = (value: string) => value.trim() !== "" && Number.isInteger(Number(value)) && Number(value) >= 1
  let validPerSetReps = false
  try { validPerSetReps = parseRepsBySet(repsBySetText).length === Number(setsMax || setsMin) } catch {}
  const validPrescription = validCount(setsMin)
    && (setsMax === "" || (validCount(setsMax) && Number(setsMax) >= Number(setsMin)))
    && (targetType === "per_set" ? validPerSetReps : validCount(repsMin)
      && (repsMax === "" || (validCount(repsMax) && Number(repsMax) >= Number(repsMin))))

  function handleAddExercise() {
    if ((freePick ? !freePickCriteria.trim() : !selectedExId) || !selectedTemplate || !validPrescription) return
    startTransition(async () => {
      try {
        const data = {
          exerciseId: freePick ? null : selectedExId,
          freePickCriteria: freePick ? freePickCriteria.trim() : null,
          section,
          superset: section === "accessory" ? superset.trim() || undefined : undefined,
          totalRepsMin: targetType !== "time" && totalRepsMin ? Number(totalRepsMin) : undefined,
          totalRepsMax: targetType !== "time" && totalRepsMax ? Number(totalRepsMax) : undefined,
          percentages: weightType === "pb_percent" ? parsePercentages(percentText) : undefined,
          setsMin: Number(setsMin),
          setsMax: setsMax ? Number(setsMax) : undefined,
          repsMin: targetType === "per_set" ? parseRepsBySet(repsBySetText)[0] : targetType === "reps" ? Number(repsMin) : 1,
          repsMax: targetType === "reps" && repsMax ? Number(repsMax) : undefined,
          repsBySet: targetType === "per_set" ? parseRepsBySet(repsBySetText) : undefined,
          durationSecondsMin: targetType === "time" ? Number(repsMin) : undefined,
          durationSecondsMax: targetType === "time" && repsMax ? Number(repsMax) : undefined,
          weightType,
          weightValue: weightValue ? Number(weightValue) : undefined,
          rpeTarget: rpeTarget ? Number(rpeTarget) : undefined,
          notes: exNotes || undefined,
        }
        if (editingExercise) {
          await updateTemplateExercise(editingExercise.id, {
            ...data,
            superset: data.superset ?? null,
            totalRepsMin: data.totalRepsMin ?? null,
            totalRepsMax: data.totalRepsMax ?? null,
            percentages: data.percentages ?? null,
            setsMax: data.setsMax ?? null,
            repsMax: data.repsMax ?? null,
            repsBySet: data.repsBySet ?? null,
            durationSecondsMin: data.durationSecondsMin ?? null,
            durationSecondsMax: data.durationSecondsMax ?? null,
            weightValue: weightType === "fixed" ? data.weightValue ?? null : null,
            rpeTarget: weightType === "rpe" ? data.rpeTarget ?? null : null,
            notes: data.notes ?? null,
          })
        } else {
          await addTemplateExercise({
            ...data,
            workoutTemplateId: selectedTemplate.id,
            orderIndex: Math.max(-1, ...templateExercises.map((row) => row.te.orderIndex)) + 1,
          })
        }
        const rows = await getTemplateExercises(selectedTemplate.id)
        setTemplateExercises(rows as TemplateExerciseRow[])
        resetExForm()
        setAddExOpen(false)
      } catch (error) { setExerciseError(error instanceof Error ? error.message : "Could not save exercise.") }
    })
  }

  function handleRemoveExercise(teId: number) {
    startTransition(async () => {
      await deleteTemplateExercise(teId)
      setTemplateExercises((prev) => prev.filter((r) => r.te.id !== teId))
    })
  }

  async function handleCreateExercise() {
    if (!newExName.trim()) return
    startTransition(async () => {
      const ex = await addExercise({ name: newExName.trim(), muscleGroup: newExMuscle || undefined })
      setExercises((prev) => [...prev, ex])
      setSelectedExId(ex.id)
      setNewExName("")
      setNewExMuscle("")
      setNewExOpen(false)
    })
  }

  function resetExForm() {
    setFreePick(false)
    setFreePickCriteria("")
    setEditingExercise(null)
    setSection("main")
    setSuperset("")
    setPercentText("")
    setTotalRepsMin("")
    setTotalRepsMax("")
    setExerciseError("")
    setSelectedExId(null)
    setSetsMin("3")
    setSetsMax("")
    setTargetType("reps")
    setRepsMin("5")
    setRepsMax("")
    setRepsBySetText("5, 3, 1")
    setWeightType("fixed")
    setWeightValue("")
    setRpeTarget("")
    setExNotes("")
  }

  function handleEditExercise(te: TemplateExercise) {
    resetExForm()
    setEditingExercise(te)
    setFreePick(te.exerciseId == null)
    setFreePickCriteria(te.freePickCriteria ?? "")
    setSelectedExId(te.exerciseId)
    setSection(te.section)
    setSuperset(te.superset ?? "")
    setSetsMin(String(te.setsMin))
    setSetsMax(te.setsMax == null ? "" : String(te.setsMax))
    setTargetType(te.durationSecondsMin != null ? "time" : te.repsBySet?.length ? "per_set" : "reps")
    setRepsBySetText(te.repsBySet?.join(", ") ?? "5, 3, 1")
    setRepsMin(String(te.durationSecondsMin ?? te.repsMin))
    const max = te.durationSecondsMin != null ? te.durationSecondsMax : te.repsMax
    setRepsMax(max == null ? "" : String(max))
    setTotalRepsMin(te.totalRepsMin == null ? "" : String(te.totalRepsMin))
    setTotalRepsMax(te.totalRepsMax == null ? "" : String(te.totalRepsMax))
    setWeightType(te.weightType)
    setWeightValue(te.weightValue ?? "")
    setPercentText(te.percentages?.length ? te.percentages.map(formatTarget).join(", ") : te.weightType === "pb_percent" ? te.weightValue ?? "" : "")
    setRpeTarget(te.rpeTarget ?? "")
    setExNotes(te.notes ?? "")
    setAddExOpen(true)
  }

  function describeWeight(te: TemplateExerciseRow["te"]) {
    if (te.weightType === "fixed") return te.weightValue ? `${te.weightValue} kg` : "Fixed"
    if (te.weightType === "pb_percent" && te.percentages?.length) return te.percentages.map(formatTarget).join(", ") + "% of PB"
    if (te.weightType === "pb_percent") return te.weightValue ? `${te.weightValue}% of PB` : "% of PB"
    if (te.weightType === "rpe") return te.rpeTarget ? `RPE ${te.rpeTarget}` : "RPE"
    return ""
  }

  // Group templates by week
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)

  function handleMoveTemplate(weekNumber: number, dayNumber: number) {
    if (!selectedTemplate) return
    startTransition(async () => {
      try {
        const t = await updateWorkoutTemplate(selectedTemplate.id, { weekNumber, dayNumber })
        setTemplates((prev) => prev.map((row) => row.id === t.id ? t : row))
        setSelectedTemplate(t)
        setScheduleError("")
      } catch (error) { setScheduleError(error instanceof Error ? error.message : "Could not move day.") }
    })
  }

  function handleRenameTemplate(name: string) {
    if (!selectedTemplate || name.trim() === selectedTemplate.name) return
    if (!name.trim()) { setScheduleError("Enter a workout name."); return }
    startTransition(async () => {
      try {
        const t = await updateWorkoutTemplate(selectedTemplate.id, { name: name.trim() })
        setTemplates((prev) => prev.map((row) => row.id === t.id ? t : row))
        setSelectedTemplate(t)
        setScheduleError("")
      } catch (error) { setScheduleError(error instanceof Error ? error.message : "Could not rename workout.") }
    })
  }

  function handleChangeWeeks(removeWeek?: number) {
    if (removeWeek !== undefined && templates.some((t) => t.weekNumber === removeWeek) && !window.confirm("Remove week " + removeWeek + " and its planned workouts/rest days? Later weeks move up. Workout logs are kept.")) return
    startTransition(async () => {
      try {
        const result = await changeProgramWeeks(program.id, removeWeek)
        setTotalWeeks(result.program.totalWeeks)
        setTemplates(result.templates)
        setSelectedTemplate((prev) => result.templates.find((t) => t.id === prev?.id) ?? null)
        setNewTemplateWeek((prev) => Math.min(prev, result.program.totalWeeks))
        setDupWeek((prev) => Math.min(prev, result.program.totalWeeks))
        setScheduleError("")
      } catch (error) { setScheduleError(error instanceof Error ? error.message : "Could not change weeks.") }
    })
  }

  return {
    newTemplateWarmup, setNewTemplateWarmup, handleSaveWarmup,
    handleRenameTemplate, setSection,
    freePick, setFreePick, freePickCriteria, setFreePickCriteria,
    editingFunctionalBlock, ffError, handleEditFunctionalBlock, handleMoveExercise,
    totalWeeks, scheduleError, newRestDay, setNewRestDay, handleMoveTemplate, handleChangeWeeks,
    templates,
    exercises,
    selectedTemplate,
    templateExercises,
    setTemplateExercises,
    functionalBlocks,
    pending,
    dupOpen,
    setDupOpen,
    dupWeek,
    setDupWeek,
    dupDay,
    setDupDay,
    ffOpen,
    setFfOpen,
    ffKind,
    setFfKind,
    ffTitle,
    setFfTitle,
    ffSource,
    setFfSource,
    ffDetails,
    setFfDetails,
    ffDuration,
    setFfDuration,
    newTemplateName,
    setNewTemplateName,
    newTemplateWeek,
    setNewTemplateWeek,
    newTemplateDay,
    setNewTemplateDay,
    addTemplateOpen,
    setAddTemplateOpen,
    addExOpen,
    setAddExOpen,
    editingExercise,
    selectedExId,
    setSelectedExId,
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
    weightType,
    setWeightType,
    weightValue,
    setWeightValue,
    rpeTarget,
    setRpeTarget,
    exNotes,
    setExNotes,
    section,
    superset,
    setSuperset,
    percentText,
    setPercentText,
    totalRepsMin,
    setTotalRepsMin,
    totalRepsMax,
    setTotalRepsMax,
    exerciseError,
    newExOpen,
    setNewExOpen,
    newExName,
    setNewExName,
    newExMuscle,
    setNewExMuscle,
    selectTemplate,
    handleDuplicateDay,
    handleAddFunctionalBlock,
    handleRemoveFunctionalBlock,
    resetFfForm,
    handleAddTemplate,
    handleDeleteTemplate,
    validPrescription,
    handleAddExercise,
    handleRemoveExercise,
    handleCreateExercise,
    resetExForm,
    handleEditExercise,
    describeWeight,
    weeks,
  }
}
