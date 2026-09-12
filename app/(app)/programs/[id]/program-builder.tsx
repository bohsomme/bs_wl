"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import {
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  getTemplateExercises,
  addTemplateExercise,
  deleteTemplateExercise,
  duplicateWorkoutTemplate,
  getFunctionalBlocks,
  addFunctionalBlock,
  deleteFunctionalBlock,
} from "@/lib/actions/programs"
import { addExercise } from "@/lib/actions/exercises"
import type { Program, WorkoutTemplate, Exercise, TemplateFunctionalBlock } from "@/lib/db/schema"
import { FUNCTIONAL_PRESETS, functionalHeading, type FunctionalKind } from "@/lib/functional-fitness"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Plus, Trash2, Dumbbell, GripVertical, Settings, Copy, Flame, Clock } from "lucide-react"

const DAYS = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`)

interface TemplateExerciseRow {
  te: {
    id: number
    workoutTemplateId: number
    exerciseId: number
    orderIndex: number
    setsMin: number
    setsMax: number | null
    repsMin: number
    repsMax: number | null
    weightType: string
    weightValue: string | null
    rpeTarget: string | null
    notes: string | null
    createdAt: Date
  }
  exercise: Exercise
}

interface ProgramBuilderProps {
  program: Program
  initialTemplates: WorkoutTemplate[]
  exercises: Exercise[]
}

export function ProgramBuilder({ program, initialTemplates, exercises: initialExercises }: ProgramBuilderProps) {
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
  const [selectedExId, setSelectedExId] = useState<number | null>(null)
  const [setsMin, setSetsMin] = useState("3")
  const [setsMax, setSetsMax] = useState("")
  const [repsMin, setRepsMin] = useState("5")
  const [repsMax, setRepsMax] = useState("")
  const [weightType, setWeightType] = useState("fixed")
  const [weightValue, setWeightValue] = useState("")
  const [rpeTarget, setRpeTarget] = useState("")
  const [exNotes, setExNotes] = useState("")

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
    if (!selectedExId || !selectedTemplate || !validPrescription) return
    startTransition(async () => {
      await addTemplateExercise({
        workoutTemplateId: selectedTemplate.id,
        exerciseId: selectedExId,
        orderIndex: templateExercises.length,
        setsMin: Number(setsMin),
        setsMax: setsMax ? Number(setsMax) : undefined,
        repsMin: Number(repsMin),
        repsMax: repsMax ? Number(repsMax) : undefined,
        weightType,
        weightValue: weightValue ? Number(weightValue) : undefined,
        rpeTarget: rpeTarget ? Number(rpeTarget) : undefined,
        notes: exNotes || undefined,
      })
      const rows = await getTemplateExercises(selectedTemplate.id)
      setTemplateExercises(rows as TemplateExerciseRow[])
      resetExForm()
      setAddExOpen(false)
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

  function describeWeight(te: TemplateExerciseRow["te"]) {
    if (te.weightType === "fixed") return te.weightValue ? `${te.weightValue} kg` : "Fixed"
    if (te.weightType === "pb_percent") return te.weightValue ? `${te.weightValue}% of PB` : "% of PB"
    if (te.weightType === "rpe") return te.rpeTarget ? `RPE ${te.rpeTarget}` : "RPE"
    return ""
  }

  // Group templates by week
  const weeks = Array.from({ length: program.totalWeeks }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button render={<Link href="/programs" />} variant="ghost" size="icon">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{program.name}</h1>
          <p className="text-sm text-muted-foreground">{program.totalWeeks} weeks</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: template list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Workouts</h2>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setAddTemplateOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>

          {weeks.map((week) => {
            const weekTemplates = templates.filter((t) => t.weekNumber === week)
            return (
              <div key={week}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Week {week}</p>
                {weekTemplates.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-2">No workouts</p>
                ) : (
                  <div className="space-y-1">
                    {weekTemplates
                      .sort((a, b) => a.dayNumber - b.dayNumber)
                      .map((t) => (
                        <div
                          key={t.id}
                          onClick={() => selectTemplate(t)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                            selectedTemplate?.id === t.id
                              ? "bg-primary/15 text-foreground"
                              : "hover:bg-accent"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Dumbbell className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{DAYS[t.dayNumber - 1]}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id) }}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: exercise builder */}
        <div className="lg:col-span-3 space-y-4">
          {selectedTemplate ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{selectedTemplate.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Week {selectedTemplate.weekNumber} &middot; {DAYS[selectedTemplate.dayNumber - 1]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      setDupWeek(Math.min(selectedTemplate.weekNumber + 1, program.totalWeeks))
                      setDupDay(selectedTemplate.dayNumber)
                      setDupOpen(true)
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => setAddExOpen(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add Exercise
                  </Button>
                </div>
              </div>

              {templateExercises.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center space-y-2">
                    <Dumbbell className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-medium">No exercises yet</p>
                    <p className="text-xs text-muted-foreground">Add exercises to build this workout.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {templateExercises.map((row, i) => (
                    <Card key={row.te.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-muted-foreground text-sm w-5 text-center shrink-0">{i + 1}</span>
                            <div className="min-w-0">
                              <p className="font-medium text-sm">{row.exercise.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.te.setsMin}{row.te.setsMax ? `–${row.te.setsMax}` : ""} sets &times;{" "}
                                {row.te.repsMin}{row.te.repsMax ? `–${row.te.repsMax}` : ""} reps
                                {" · "}{describeWeight(row.te)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => handleRemoveExercise(row.te.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Functional Fitness */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-primary" /> Functional Fitness
                  </h3>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setFfOpen(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
                {functionalBlocks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-1">
                    No functional work. Add a MetCon, Zone 2, mobility, or a specific workout.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {functionalBlocks.map((b) => (
                      <Card key={b.id}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="font-medium text-sm">{functionalHeading(b)}</p>
                              <div className="flex flex-wrap gap-1.5">
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => handleRemoveFunctionalBlock(b.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <Card className="border-dashed h-full min-h-48">
              <CardContent className="flex flex-col items-center justify-center h-full py-16 gap-2 text-center">
                <Settings className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">Select a workout</p>
                <p className="text-xs text-muted-foreground">Choose a workout from the left to edit its exercises.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Template Dialog */}
      <Dialog open={addTemplateOpen} onOpenChange={setAddTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Workout</DialogTitle>
            <DialogDescription>Create a new workout session for this program.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Workout name</Label>
              <Input
                placeholder="e.g. Lower A, Upper, Pull Day"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Week</Label>
                <Select value={String(newTemplateWeek)} onValueChange={(v) => setNewTemplateWeek(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weeks.map((w) => (
                      <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Day</Label>
                <Select value={String(newTemplateDay)} onValueChange={(v) => setNewTemplateDay(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTemplateOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTemplate} disabled={pending || !newTemplateName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Exercise to Template Dialog */}
      <Dialog open={addExOpen} onOpenChange={(open) => { setAddExOpen(open); if (!open) resetExForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
            <DialogDescription>Prescribe sets, reps, and loading for this exercise.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Exercise</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedExId ? String(selectedExId) : ""}
                  onValueChange={(v) => setSelectedExId(Number(v))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select exercise...">{exercises.find((ex) => ex.id === selectedExId)?.name}</SelectValue>
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
              <div className="space-y-1.5">
                <Label>Reps (min)</Label>
                <Input type="number" min={1} value={repsMin} onChange={(e) => setRepsMin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Reps (max, optional)</Label>
                <Input type="number" min={1} placeholder="Same as min" value={repsMax} onChange={(e) => setRepsMax(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Loading type</Label>
              <Select value={weightType} onValueChange={(value) => { if (value !== null) setWeightType(value) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed weight (kg)</SelectItem>
                  <SelectItem value="pb_percent">% of Personal Best</SelectItem>
                  <SelectItem value="rpe">RPE target</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {weightType === "fixed" && (
              <div className="space-y-1.5">
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.5" placeholder="e.g. 100" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} />
              </div>
            )}
            {weightType === "pb_percent" && (
              <div className="space-y-1.5">
                <Label>Percentage of PB (%)</Label>
                <Input type="number" min={1} max={110} placeholder="e.g. 75" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} />
              </div>
            )}
            {weightType === "rpe" && (
              <div className="space-y-1.5">
                <Label>RPE target</Label>
                <Input type="number" min={1} max={10} step="0.5" placeholder="e.g. 8" value={rpeTarget} onChange={(e) => setRpeTarget(e.target.value)} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input placeholder="Coaching cues, focus points..." value={exNotes} onChange={(e) => setExNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddExOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExercise} disabled={pending || !selectedExId || !validPrescription}>Add</Button>
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

      {/* Duplicate Day Dialog */}
      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Training Day</DialogTitle>
            <DialogDescription>
              Copy {selectedTemplate?.name} — including exercises and functional work — to another week and day.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Week</Label>
              <Select value={String(dupWeek)} onValueChange={(v) => setDupWeek(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map((w) => (
                    <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={String(dupDay)} onValueChange={(v) => setDupDay(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupOpen(false)}>Cancel</Button>
            <Button onClick={handleDuplicateDay} disabled={pending}>Duplicate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Functional Fitness Dialog */}
      <Dialog open={ffOpen} onOpenChange={(open) => { setFfOpen(open); if (!open) resetFfForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Functional Fitness</DialogTitle>
            <DialogDescription>
              Pick a type of workout, or choose Custom to type a specific one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={ffKind} onValueChange={(v) => setFfKind(v as FunctionalKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUNCTIONAL_PRESETS.map((p) => (
                    <SelectItem key={p.kind} value={p.kind}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{ffKind === "custom" ? "Specific workout" : "Label (optional)"}</Label>
              <Input
                placeholder={ffKind === "custom" ? "e.g. Fran, 21-15-9 thrusters & pull-ups" : "e.g. Rowing intervals 5×500m"}
                value={ffTitle}
                onChange={(e) => setFfTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source (optional)</Label>
                <Input
                  placeholder={FUNCTIONAL_PRESETS.find((p) => p.kind === ffKind)?.defaultSource ?? "e.g. Other app"}
                  value={ffSource}
                  onChange={(e) => setFfSource(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (min, optional)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 20"
                  value={ffDuration}
                  onChange={(e) => setFfDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Details (optional)</Label>
              <Textarea
                placeholder="Describe the workout, target pace, scaling, cues..."
                rows={3}
                value={ffDetails}
                onChange={(e) => setFfDetails(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFfOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddFunctionalBlock}
              disabled={pending || (ffKind === "custom" && !ffTitle.trim())}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
