import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getWorkoutLogDetail } from "@/lib/actions/workouts"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ExerciseLogCard } from "./exercise-log-card"

interface Props {
  params: Promise<{ id: string }>
}

export default async function LogDetailPage({ params }: Props) {
  const { id } = await params
  const logId = Number(id)
  if (isNaN(logId)) notFound()

  const data = await getWorkoutLogDetail(logId)
  if (!data) notFound()

  const { log, exerciseLogs, setsMap } = data

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button render={<Link href={log.status === "completed" ? `/log?program=${log.programId ?? "unassigned"}` : "/log"} />} variant="ghost" size="icon" aria-label="Back to workout log">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{log.name}</h1>
          <p className="text-sm text-muted-foreground">
            {log.completedAt
              ? new Date(log.completedAt).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
              : "In progress"}
          </p>
        </div>
      </div>

      {/* Session summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Session Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {log.readiness && (
              <Badge variant="outline">Readiness {log.readiness}/{log.readiness > 5 ? "10 (legacy)" : "5"}</Badge>
            )}
            {log.barFeel && (
              <Badge variant="outline">Bar feel {log.barFeel}/{log.barFeel > 5 ? "10 (legacy)" : "5"}</Badge>
            )}
            {log.sessionRpe && (
              <Badge variant="secondary">Session RPE {log.sessionRpe}</Badge>
            )}
          </div>
          {log.preNotes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Pre-workout notes</p>
              <p className="text-sm">{log.preNotes}</p>
            </div>
          )}
          {log.functionalNotes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Functional Fitness notes</p>
              <p className="text-sm whitespace-pre-wrap">{log.functionalNotes}</p>
            </div>
          )}
          {log.postNotes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Post-workout notes</p>
              <p className="text-sm">{log.postNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise logs */}
      <div className="space-y-3">
        <h2 className="font-semibold">Exercises</h2>
        {exerciseLogs.map(({ el, exercise }) => {
          const sets = setsMap[el.id] ?? []

          return (
            <ExerciseLogCard key={el.id} el={el} exercise={exercise} sets={sets} />
          )
        })}
      </div>
    </div>
  )
}
