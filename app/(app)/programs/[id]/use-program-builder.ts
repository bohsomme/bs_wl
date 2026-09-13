"use client"
import { addExercise } from "@/lib/actions/exercises"
import {
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
} from "@/lib/actions/programs"
import type { TemplateExercise, TemplateFunctionalBlock, WorkoutTemplate } from "@/lib/db/schema"
import { type FunctionalKind } from "@/lib/functional-fitness"
import { formatTarget, parsePercentages } from "@/lib/prescription"
import { useState, useTransition } from "react"
import type { ProgramBuilderProps, TemplateExerciseRow } from "./program-types"

export function useProgramBuilder({ program, initialTemplates, exercises: initialExercises }: ProgramBuilderProps) {
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
  const [ffKind, setFfKind] = useState<FunctionalKind>("metcon")
  const [ffTitle, setFfTitle] = useState("")
  const [ffSource, setFfSource] = useState("")
  const [ffDetails, setFfDetails] = useState("")
  const [ffDuration, setFfDuration] = useState("")

  // New template form
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateWeek, setNewTemplateWeek] = useState(1)
  const [newTemplateDay, setNewTemplateDay] = useState(1)
  const [addTemplateOpen, setAddTemplateOpen] = useState(false)

  // Add exercise to template
  const [addExOpen, setAddExOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<TemplateExercise | null>(null)
  const [selectedExId, setSelectedExId] = useState<number | null>(null)
  const [setsMin, setSetsMin] = useState("3")
  const [setsMax, setSetsMax] = useState("")
  const [repsMin, setRepsMin] = useState("5")
  const [repsMax, setRepsMax] = useState("")
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
      const t = await duplicateWorkoutTemplate({
        templateId: selectedTemplate.id,
        targetWeek: dupWeek,
        targetDay: dupDay,
        programId: program.id,
      })
      setTemplates((prev) => [...prev, t])
      setDupOpen(false)
    })
  }

  function handleAddFunctionalBlock() {
    if (!selectedTemplate) return
    if (ffKind === "custom" && !ffTitle.trim()) return
    startTransition(async () => {
      const block = await addFunctionalBlock({
        workoutTemplateId: selectedTemplate.id,
        kind: ffKind,
        title: ffTitle.trim() || undefined,
        source: ffSource.trim() || undefined,
        details: ffDetails.trim() || undefined,
        durationMin: ffDuration ? Number(ffDuration) : undefined,
        orderIndex: functionalBlocks.length,
      })
      setFunctionalBlocks((prev) => [...prev, block])
      resetFfForm()
      setFfOpen(false)
    })
  }

  function handleRemoveFunctionalBlock(id: number) {
    startTransition(async () => {
      await deleteFunctionalBlock(id)
      setFunctionalBlocks((prev) => prev.filter((b) => b.id !== id))
    })
  }

  function resetFfForm() {
    setFfKind("metcon")
    setFfTitle("")
    setFfSource("")
    setFfDetails("")
    setFfDuration("")
  }

  function handleAddTemplate() {
    if (!newTemplateName.trim()) return
    startTransition(async () => {
      const t = await createWorkoutTemplate({
        programId: program.id,
        name: newTemplateName.trim(),
        weekNumber: newTemplateWeek,
        dayNumber: newTemplateDay,
      })
      setTemplates((prev) => [...prev, t])
      setNewTemplateName("")
      setAddTemplateOpen(false)
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
  const validPrescription = validCount(setsMin) && validCount(repsMin)
    && (setsMax === "" || (validCount(setsMax) && Number(setsMax) >= Number(setsMin)))
    && (repsMax === "" || (validCount(repsMax) && Number(repsMax) >= Number(repsMin)))

  function handleAddExercise() {
    if ((!selectedExId && !editingExercise?.freePickCriteria) || !selectedTemplate || !validPrescription) return
    startTransition(async () => {
      try {
        const data = {
          exerciseId: selectedExId,
          freePickCriteria: selectedExId ? null : editingExercise?.freePickCriteria,
          section,
          superset: section === "accessory" ? superset.trim() || undefined : undefined,
          totalRepsMin: totalRepsMin ? Number(totalRepsMin) : undefined,
          totalRepsMax: totalRepsMax ? Number(totalRepsMax) : undefined,
          percentages: weightType === "pb_percent" ? parsePercentages(percentText) : undefined,
          setsMin: Number(setsMin),
          setsMax: setsMax ? Number(setsMax) : undefined,
          repsMin: Number(repsMin),
          repsMax: repsMax ? Number(repsMax) : undefined,
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
    setRepsMin("5")
    setRepsMax("")
    setWeightType("fixed")
    setWeightValue("")
    setRpeTarget("")
    setExNotes("")
  }

  function handleEditExercise(te: TemplateExercise) {
    resetExForm()
    setEditingExercise(te)
    setSelectedExId(te.exerciseId)
    setSection(te.section)
    setSuperset(te.superset ?? "")
    setSetsMin(String(te.setsMin))
    setSetsMax(te.setsMax == null ? "" : String(te.setsMax))
    setRepsMin(String(te.repsMin))
    setRepsMax(te.repsMax == null ? "" : String(te.repsMax))
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
  const weeks = Array.from({ length: program.totalWeeks }, (_, i) => i + 1)

  return {
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
    setEditingExercise,
    selectedExId,
    setSelectedExId,
    setsMin,
    setSetsMin,
    setsMax,
    setSetsMax,
    repsMin,
    setRepsMin,
    repsMax,
    setRepsMax,
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
