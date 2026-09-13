"use client"
import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import type { Exercise, PersonalBest } from "@/lib/db/schema"
import { calculateOneRepMax } from "@/lib/strength"
import { Trophy } from "lucide-react"

type PbRow = {
  pb: PersonalBest
  exercise: Exercise
}

interface PersonalBestsTabProps {
  pbs: PbRow[]
}

export function PersonalBestsTab({
  pbs,
}: PersonalBestsTabProps) {
  return (
    <TabsContent value="pbs" className="mt-4">
      {pbs.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="font-medium text-sm">No personal bests yet</p>
          <p className="text-xs text-muted-foreground">PBs update automatically when you hit new records during workouts.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pbs.map(({ pb, exercise }) => (
            <Card key={pb.id}>
              <CardContent className="py-4 flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{exercise.name}</p>
                  <p className="text-xs text-muted-foreground">{exercise.muscleGroup}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-primary">{pb.weight} kg</p>
                  <p className="text-xs text-muted-foreground">&times; {pb.reps} rep{pb.reps !== 1 ? "s" : ""}</p>
                  {pb.reps > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Predicted 1RM: {Number(calculateOneRepMax(Number(pb.weight), pb.reps).toFixed(1))} kg
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TabsContent>
  )
}
