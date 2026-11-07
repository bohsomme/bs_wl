import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkoutWarmup } from "@/components/workout-warmup"
import type { Exercise, TemplateExercise, TemplateFunctionalBlock, WorkoutTemplate } from "@/lib/db/schema"
import { functionalHeading } from "@/lib/functional-fitness"
import { describeExerciseTarget, formatTarget } from "@/lib/prescription"
import { groupTemplateExercises } from "@/lib/template-exercise-order"

type ExerciseRow = { te: TemplateExercise; exercise: Exercise | null }

function PlannedExercise({ te, exercise }: ExerciseRow) {
  const weight = te.weightType === "pb_percent"
    ? te.percentages?.length
      ? `${te.percentages.map((target) => `${formatTarget(target)}%`).join(", ")} of PB${te.percentages.length > 1 ? " (by set)" : ""}`
      : te.weightValue != null ? `${te.weightValue}% of PB` : "% of PB"
    : te.weightType === "fixed" && te.weightValue != null ? `${te.weightValue} kg` : null

  return <div className="space-y-2 break-words">
    <h4 className="font-medium">{exercise?.name ?? "Free-pick exercise"}</h4>
    {te.freePickCriteria && <p className="whitespace-pre-wrap text-sm">{te.freePickCriteria}</p>}
    <p className="text-sm text-muted-foreground">
      {formatTarget({ min: te.setsMin, max: te.setsMax ?? undefined })} sets &times; {describeExerciseTarget(te)}
      {weight && <> &middot; {weight}</>}
      {te.rpeTarget != null ? <> &middot; RPE {te.rpeTarget}</> : te.weightType === "rpe" ? " · RPE" : null}
    </p>
    {te.totalRepsMin != null && <p className="text-sm">Total reps target: {formatTarget({ min: te.totalRepsMin, max: te.totalRepsMax ?? undefined })}</p>}
    {te.notes && <p className="whitespace-pre-wrap text-sm">{te.notes}</p>}
    {exercise?.muscleGroup && <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p>}
    {exercise?.description && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{exercise.description}</p>}
  </div>
}

export function PlannedWorkoutOverview({ template, programName, exercises, functionalBlocks }: {
  template: WorkoutTemplate
  programName: string
  exercises: ExerciseRow[]
  functionalBlocks: TemplateFunctionalBlock[]
}) {
  return <Card id={`workout-${template.id}`}>
    <CardHeader>
      <CardTitle><h2>{template.name}</h2></CardTitle>
      <p className="text-sm text-muted-foreground">{programName} &middot; Week {template.weekNumber} &middot; Day {template.dayNumber}</p>
    </CardHeader>
    <CardContent className="space-y-6">
      {template.isRestDay ? <p className="text-sm text-muted-foreground">Rest day.</p> : <>
        {template.warmup?.trim() && <WorkoutWarmup warmup={template.warmup} />}
        {(["main", "accessory"] as const).map((section) => {
          const rows = exercises.filter(({ te }) => section === "accessory" ? te.section === "accessory" : te.section !== "accessory")
          if (!rows.length) return null
          return <section key={section} className="space-y-3">
            <h3 className="font-semibold">{section === "main" ? "Main exercises" : "Accessories"}</h3>
            {groupTemplateExercises(rows).map((group) => <div key={group[0].te.id} className="space-y-4 rounded-lg border p-4">
              {group[0].te.superset && <p className="text-sm font-semibold">Superset: {group[0].te.superset} — alternate exercises each round</p>}
              {group.map((row) => <PlannedExercise key={row.te.id} {...row} />)}
            </div>)}
          </section>
        })}
        {functionalBlocks.length > 0 && <section className="space-y-3">
          <h3 className="font-semibold">Functional Fitness</h3>
          {functionalBlocks.map((block) => <div key={block.id} className="space-y-2 rounded-lg border p-4 break-words">
            <h4 className="font-medium">{functionalHeading(block)}</h4>
            {(block.source || block.durationMin != null) && <p className="text-sm text-muted-foreground">
              {block.source}{block.source && block.durationMin != null && " · "}{block.durationMin != null && `${block.durationMin} min`}
            </p>}
            {block.details && <p className="whitespace-pre-wrap text-sm">{block.details}</p>}
          </div>)}
        </section>}
        {!exercises.length && !functionalBlocks.length && <p className="text-sm text-muted-foreground">No exercises prescribed.</p>}
      </>}
    </CardContent>
  </Card>
}
