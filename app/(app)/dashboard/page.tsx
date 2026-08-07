import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/actions/auth"
import { getNextWorkout, getActiveWorkout } from "@/lib/actions/workouts"
import { getWorkoutLogs } from "@/lib/actions/workouts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StartWorkoutButton } from "@/components/start-workout-button"
import { CalendarDays, Dumbbell, Play, History, Trophy, BookOpen } from "lucide-react"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function formatDate(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff < 7) return DAYS[d.getDay()]
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function HomePage() {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  const [next, active, recentLogs] = await Promise.all([
    getNextWorkout(),
    getActiveWorkout(),
    getWorkoutLogs(),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-balance">
          Welcome back, {session.user.name?.split(" ")[0] ?? "Athlete"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Ready to train?</p>
      </div>

      {/* Active workout banner */}
      {active && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Workout in progress</p>
                <p className="text-muted-foreground text-xs">{active.name}</p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link href={`/workout/${active.id}`}>Resume</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grid: next workout + quick stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Next workout card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Next Workout</CardTitle>
              {next && (
                <Badge variant="outline" className="text-xs">
                  <CalendarDays className="w-3 h-3 mr-1" />
                  {formatDate(next.nextDate)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {next ? (
              <div className="space-y-3">
                <div>
                  <p className="font-semibold">{next.template.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {next.program.name} &middot; Week {next.weekNumber} &middot;{" "}
                    {DAYS[next.template.dayOfWeek]}
                  </p>
                </div>
                <Separator />
                <StartWorkoutButton
                  templateId={next.template.id}
                  programId={next.program.id}
                  workoutName={next.template.name}
                />
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <Dumbbell className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <div>
                  <p className="font-medium text-sm">No active program</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Set up a program to see your next workout here
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/programs">Go to Programs</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              render={<Link href="/programs" />}
              variant="outline"
              className="h-11 w-full justify-start gap-3 px-4"
            >
              <BookOpen className="w-4 h-4" /> Programs
            </Button>
            <Button
              render={<Link href="/exercises" />}
              variant="outline"
              className="h-11 w-full justify-start gap-3 px-4"
            >
              <Trophy className="w-4 h-4" /> Exercises &amp; PBs
            </Button>
            <Button
              render={<Link href="/log" />}
              variant="outline"
              className="h-11 w-full justify-start gap-3 px-4"
            >
              <History className="w-4 h-4" /> Workout Log
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent workouts */}
      {recentLogs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent Workouts</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/log">View all</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {recentLogs.slice(0, 3).map((log) => (
              <Link key={log.id} href={`/log/${log.id}`}>
                <Card className="hover:bg-accent/40 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-sm">{log.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.completedAt
                          ? new Date(log.completedAt).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </p>
                    </div>
                    {log.sessionRpe && (
                      <Badge variant="secondary">RPE {log.sessionRpe}</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
