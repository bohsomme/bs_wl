import { notFound } from "next/navigation"
import Link from "next/link"
import { getWorkoutLogDetail } from "@/lib/actions/workouts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, NotebookPen, CheckCircle2, XCircle, Zap } from "lucide-react"

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
        <Button render={<Link href="/log" />} variant="ghost" size="icon">
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
          const workingSets = sets.filter((s) => !s.isMakeup)
          const makeupSets = sets.filter((s) => s.isMakeup)

          return (
            <Card key={el.id} className={el.skipped ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{exercise.name}</CardTitle>
                    {el.skipped && <Badge variant="outline" className="text-xs">Skipped</Badge>}
                  </div>
                  {el.topSetRpe && (
                    <Badge variant="secondary" className="text-xs">
                      Top set RPE {el.topSetRpe}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {!el.skipped && (
                <CardContent className="space-y-2">
                  {sets.length > 0 ? (
                    <div className="space-y-1">
                      <div className="grid grid-cols-12 text-xs text-muted-foreground font-medium px-1 gap-2">
                        <span className="col-span-1">#</span>
                        <span className="col-span-4">Weight</span>
                        <span className="col-span-3">Reps</span>
                        <span className="col-span-4">Status</span>
                      </div>
                      {workingSets.map((s) => (
                        <div
                          key={s.id}
                          className={`grid grid-cols-12 items-center gap-2 px-1 py-1 rounded text-sm ${s.missed ? "bg-destructive/10" : ""}`}
                        >
                          <span className="col-span-1 text-muted-foreground">{s.setNumber}</span>
                          <span className="col-span-4">{s.weight ? `${s.weight} kg` : "—"}</span>
                          <span className="col-span-3">{s.reps ?? "—"}</span>
                          <span className="col-span-4">
                            {s.missed ? (
                              <div className="flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 text-destructive" />
                                <span className="text-xs text-destructive">Miss</span>
                              </div>
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            )}
                          </span>
                        </div>
                      ))}
                      {makeupSets.map((s, i) => (
                        <div key={s.id} className="grid grid-cols-12 items-center gap-2 px-1 py-1 rounded text-sm bg-primary/5">
                          <span className="col-span-1 text-primary text-xs font-bold">+{i + 1}</span>
                          <span className="col-span-4">{s.weight ? `${s.weight} kg` : "—"}</span>
                          <span className="col-span-3">{s.reps ?? "—"}</span>
                          <span className="col-span-4">
                            <Badge className="text-xs py-0">Makeup</Badge>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No sets recorded</p>
                  )}

                  {el.notes && (
                    <>
                      <Separator />
                      <div className="flex items-start gap-1.5">
                        <NotebookPen className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">{el.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
