import { getWorkoutLogs } from "@/lib/actions/workouts"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, ChevronRight } from "lucide-react"

export default async function LogPage() {
  const logs = await getWorkoutLogs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workout Log</h1>
        <p className="text-muted-foreground text-sm mt-1">All your completed workout sessions.</p>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="font-medium text-sm">No completed workouts yet</p>
          <p className="text-xs text-muted-foreground">
            Finish a workout session to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Link key={log.id} href={`/log/${log.id}`}>
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
                        Readiness {log.readiness}/10
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
          ))}
        </div>
      )}
    </div>
  )
}
