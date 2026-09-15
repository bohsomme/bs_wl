import { getWorkoutLogs } from "@/lib/actions/workouts"
import { getPrograms } from "@/lib/actions/programs"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { DeleteWorkoutButton } from "./delete-workout-button"

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string }>
}) {
  const [{ program: selectedProgram }, allLogs, programs] = await Promise.all([
    searchParams,
    getWorkoutLogs(),
    getPrograms(),
  ])
  const groups = Array.from(new Set(allLogs.map((log) => log.programId))).map((id) => {
    const program = programs.find((p) => p.id === id)
    const logs = allLogs.filter((log) => log.programId === id)
    return {
      key: id === null ? "unassigned" : String(id),
      name: program?.name ?? (id === null ? "Without a program" : "Deleted program"),
      isActive: program?.isActive ?? false,
      logs,
    }
  }).sort((a, b) => Number(b.isActive) - Number(a.isActive))
  const selected = groups.find((group) => group.key === selectedProgram)
  if (selectedProgram !== undefined && !selected) notFound()
  const logs = selected?.logs ?? []

  return (
    <div className="space-y-6">
      <div>
        {selected && (
          <Link href="/log" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ChevronLeft className="w-4 h-4" /> All programs
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{selected?.name ?? "Workout Log"}</h1>
          {selected?.isActive && <Badge>Current program</Badge>}
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {selected ? "All your completed workout sessions in this program." : "Choose a program to view your completed workouts."}
        </p>
      </div>

      {allLogs.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="font-medium text-sm">No completed workouts yet</p>
          <p className="text-xs text-muted-foreground">
            Finish a workout session to see it here.
          </p>
        </div>
      ) : !selected ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.key} href={`/log?program=${group.key}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-primary">
              <Card className={`h-full transition-colors hover:bg-accent/40 ${group.isActive ? "border-primary/50 bg-primary/5" : ""}`}>
                <CardContent className="flex items-center justify-between py-4 gap-4">
                  <div className="min-w-0 space-y-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <p className="font-semibold text-sm break-words">{group.name}</p>
                    {group.isActive && <Badge>Current program</Badge>}
                    <p className="text-xs text-muted-foreground">
                      {group.logs.length} completed {group.logs.length === 1 ? "workout" : "workouts"}
                    </p>
                    {group.logs[0].completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last workout: {new Date(group.logs[0].completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-2">
            <Link href={`/log/${log.id}`} className="block min-w-0 flex-1">
              <Card className="hover:bg-accent/40 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4 gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <CalendarDays className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{log.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.completedAt
                          ? new Date(log.completedAt).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {log.readiness && (
                      <Badge variant="outline" className="text-xs">
                        Readiness {log.readiness}/{log.readiness > 5 ? "10 (legacy)" : "5"}
                      </Badge>
                    )}
                    {log.sessionRpe && (
                      <Badge variant="secondary" className="text-xs">
                        RPE {log.sessionRpe}
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
            <DeleteWorkoutButton id={log.id} name={log.name} returnHref={logs.length > 1 ? `/log?program=${selected.key}` : "/log"} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
