"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  getTemplateExercises
} from "@/lib/actions/programs"
import type { Exercise, Program, TemplateExercise, TemplateFunctionalBlock, WorkoutTemplate } from "@/lib/db/schema"
import { functionalHeading } from "@/lib/functional-fitness"
import { Clock, Copy, Dumbbell, Flame, Plus, Settings, Trash2 } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"
import { AccessoryForm } from "./accessory-form"
import type { TemplateExerciseRow } from "./program-types"

const DAYS = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`)

interface TemplateEditorProps {
  selectedTemplate: WorkoutTemplate | null
  setDupWeek: Dispatch<SetStateAction<number>>
  program: Program
  setDupDay: Dispatch<SetStateAction<number>>
  setDupOpen: Dispatch<SetStateAction<boolean>>
  resetExForm: () => void
  setAddExOpen: Dispatch<SetStateAction<boolean>>
  templateExercises: TemplateExerciseRow[]
  describeWeight: (te: TemplateExerciseRow["te"]) => string
  pending: boolean
  handleEditExercise: (te: TemplateExercise) => void
  handleRemoveExercise: (teId: number) => void
  exercises: Exercise[]
  setTemplateExercises: Dispatch<SetStateAction<TemplateExerciseRow[]>>
  setFfOpen: Dispatch<SetStateAction<boolean>>
  functionalBlocks: TemplateFunctionalBlock[]
  handleRemoveFunctionalBlock: (id: number) => void
}

export function TemplateEditor({
  selectedTemplate,
  setDupWeek,
  program,
  setDupDay,
  setDupOpen,
  resetExForm,
  setAddExOpen,
  templateExercises,
  describeWeight,
  pending,
  handleEditExercise,
  handleRemoveExercise,
  exercises,
  setTemplateExercises,
  setFfOpen,
  functionalBlocks,
  handleRemoveFunctionalBlock,
}: TemplateEditorProps) {
  return (
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
              <Button size="sm" className="gap-1.5" onClick={() => { resetExForm(); setAddExOpen(true) }}>
                <Plus className="w-3.5 h-3.5" /> Add Exercise
              </Button>
            </div>
          </div>

          {templateExercises.filter((row) => row.te.section !== "accessory").length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center space-y-2">
                <Dumbbell className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium">No exercises yet</p>
                <p className="text-xs text-muted-foreground">Add exercises to build this workout.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {templateExercises.filter((row) => row.te.section !== "accessory").map((row, i) => (
                <Card key={row.te.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-muted-foreground text-sm w-5 text-center shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{row.exercise?.name ?? "Free-pick: " + row.te.freePickCriteria}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.te.setsMin}{row.te.setsMax ? `–${row.te.setsMax}` : ""} sets &times;{" "}
                            {row.te.repsMin}{row.te.repsMax ? `–${row.te.repsMax}` : ""} reps
                            {" · "}{describeWeight(row.te)}
                            {row.te.totalRepsMin != null && " | Total reps: " + row.te.totalRepsMin + "-" + (row.te.totalRepsMax ?? row.te.totalRepsMin)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center shrink-0">
                        <Button variant="ghost" size="sm" disabled={pending} aria-label={"Edit " + (row.exercise?.name ?? "Free-pick: " + row.te.freePickCriteria)} onClick={() => handleEditExercise(row.te)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => handleRemoveExercise(row.te.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Accessories</h3>
              <AccessoryForm key={selectedTemplate.id} templateId={selectedTemplate.id} exercises={exercises} onSaved={async () => { setTemplateExercises(await getTemplateExercises(selectedTemplate.id)) }} />
            </div>
            {templateExercises.filter((row) => row.te.section === "accessory").length === 0 && <p className="text-xs text-muted-foreground">Add individual exercises or group them into supersets.</p>}
            {Array.from(new Set(templateExercises.filter((row) => row.te.section === "accessory").map((row) => row.te.superset ?? ""))).map((group) => (
              <div key={group} className="space-y-2 rounded-lg border p-3">
                {group && <p className="text-sm font-semibold">Superset: {group} <span className="font-normal text-muted-foreground">- alternate exercises each round</span></p>}
                {templateExercises.filter((row) => row.te.section === "accessory" && (row.te.superset ?? "") === group).map((row) => (
                  <div key={row.te.id} className="flex items-center justify-between gap-2">
                    <div><p className="text-sm font-medium">{row.exercise?.name ?? "Free-pick: " + row.te.freePickCriteria}</p><p className="text-xs text-muted-foreground">{row.te.setsMin}{row.te.setsMax ? "-" + row.te.setsMax : ""} sets &times; {row.te.repsMin}{row.te.repsMax ? "-" + row.te.repsMax : ""} reps{row.te.rpeTarget ? " | RPE " + row.te.rpeTarget : ""}</p></div>
                    <div className="flex items-center shrink-0">
                      <Button variant="ghost" size="sm" disabled={pending} aria-label={"Edit " + (row.exercise?.name ?? "Free-pick: " + row.te.freePickCriteria)} onClick={() => handleEditExercise(row.te)}>Edit</Button>
                      <Button variant="ghost" size="icon" aria-label={"Remove " + (row.exercise?.name ?? "Free-pick: " + row.te.freePickCriteria)} onClick={() => handleRemoveExercise(row.te.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                {group && templateExercises.filter((row) => row.te.section === "accessory" && row.te.superset === group).length < 2 && <p className="text-xs text-muted-foreground">Add another exercise with this superset name.</p>}
              </div>
            ))}
          </section>

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
  )
}
