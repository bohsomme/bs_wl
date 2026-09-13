import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Exercise, ExerciseLog, SetLog } from "@/lib/db/schema"
import { CheckCircle2, NotebookPen, XCircle } from "lucide-react"

export function ExerciseLogCard({ el, exercise, sets }: { el: ExerciseLog; exercise: Exercise | null; sets: SetLog[] }) {
  const workingSets = sets.filter((s) => !s.isMakeup)
  const makeupSets = sets.filter((s) => s.isMakeup)
  return (<Card key={el.id} className={el.skipped ? "opacity-60" : ""}>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{exercise?.name ?? el.exerciseName ?? "Free-pick exercise"}</CardTitle>
          {el.skipped && <Badge variant="outline" className="text-xs">Skipped</Badge>}
        </div>
        {el.topSetRpe && (
          <Badge variant="secondary" className="text-xs">
            Top set RPE {el.topSetRpe}
          </Badge>
        )}
      </div>
    </CardHeader>
    {el.freePickCriteria && <p className="px-6 pb-2 text-sm whitespace-pre-wrap text-muted-foreground">Free-pick: {el.freePickCriteria}{el.superset ? ` | Superset: ${el.superset}` : ""}</p>}
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
  </Card>)
}
