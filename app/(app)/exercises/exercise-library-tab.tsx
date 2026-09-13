"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TabsContent } from "@/components/ui/tabs"
import type { Exercise, PersonalBest } from "@/lib/db/schema"
import { calculateOneRepMax } from "@/lib/strength"
import { Plus, Search, Trash2, Trophy } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

interface ExerciseLibraryTabProps {
  search: string
  setSearch: Dispatch<SetStateAction<string>>
  setNewExOpen: Dispatch<SetStateAction<boolean>>
  groups: string[]
  filtered: Exercise[]
  pbMap: Record<string, PersonalBest>
  openPbForm: (exId: number) => void
  setDeleteId: Dispatch<SetStateAction<number | null>>
}

export function ExerciseLibraryTab({
  search,
  setSearch,
  setNewExOpen,
  groups,
  filtered,
  pbMap,
  openPbForm,
  setDeleteId,
}: ExerciseLibraryTabProps) {
  return (
    <TabsContent value="library" className="space-y-4 mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setNewExOpen(true)}>
          <Plus className="w-4 h-4" /> Add Exercise
        </Button>
      </div>

      {groups.map((group) => {
        const groupExercises = filtered.filter((ex) => (ex.muscleGroup ?? "Other") === group)
        return (
          <div key={group}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
            <div className="space-y-1">
              {groupExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-card border border-border hover:bg-accent/40 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{ex.name}</p>
                    {ex.description && (
                      <p className="text-xs text-muted-foreground truncate">{ex.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pbMap[ex.id] && (
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {pbMap[ex.id].weight} kg &times; {pbMap[ex.id].reps}
                        </Badge>
                        {pbMap[ex.id].reps > 1 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Predicted 1RM: {Number(calculateOneRepMax(Number(pbMap[ex.id].weight), pbMap[ex.id].reps).toFixed(1))} kg
                          </p>
                        )}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-9"
                      onClick={() => openPbForm(ex.id)}
                    >
                      <Trophy className="w-3.5 h-3.5 mr-1" />
                      Set PB
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 "
                      onClick={() => setDeleteId(ex.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No exercises found. Add one above.
        </div>
      )}
    </TabsContent>
  )
}
