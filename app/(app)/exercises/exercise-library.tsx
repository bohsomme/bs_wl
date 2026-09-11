"use client"

import { useState, useTransition } from "react"
import { addExercise, deleteExercise, upsertPersonalBest } from "@/lib/actions/exercises"
import type { Exercise } from "@/lib/db/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Trash2, Trophy, Search } from "lucide-react"
import { calculateOneRepMax } from "@/lib/strength"

type PbRow = {
  pb: {
    id: number
    userId: string
    exerciseId: number
    weight: string
    reps: number
    setAt: Date
    createdAt: Date
  }
  exercise: Exercise
}

interface ExerciseLibraryProps {
  initialExercises: Exercise[]
  initialPbs: PbRow[]
}

export function ExerciseLibrary({ initialExercises, initialPbs }: ExerciseLibraryProps) {
  const [exercises, setExercises] = useState(initialExercises)
  const [pbs, setPbs] = useState(initialPbs)
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState("")

  // New exercise
  const [newExOpen, setNewExOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newMuscle, setNewMuscle] = useState("")
  const [newDesc, setNewDesc] = useState("")

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // PB form
  const [pbExId, setPbExId] = useState<number | null>(null)
  const [pbWeight, setPbWeight] = useState("")
  const [pbReps, setPbReps] = useState("1")
  const [pbOpen, setPbOpen] = useState(false)

  const filtered = exercises.filter(
    (ex) =>
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      (ex.muscleGroup ?? "").toLowerCase().includes(search.toLowerCase())
  )

  // Group by muscle group
  const groups = Array.from(
    new Set(filtered.map((ex) => ex.muscleGroup ?? "Other"))
  ).sort()

  function handleAddExercise() {
    if (!newName.trim()) return
    startTransition(async () => {
      const ex = await addExercise({
        name: newName.trim(),
        muscleGroup: newMuscle.trim() || undefined,
        description: newDesc.trim() || undefined,
      })
      setExercises((prev) => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName("")
      setNewMuscle("")
      setNewDesc("")
      setNewExOpen(false)
    })
  }

  function handleDeleteExercise() {
    if (!deleteId) return
    startTransition(async () => {
      await deleteExercise(deleteId)
      setExercises((prev) => prev.filter((e) => e.id !== deleteId))
      setPbs((prev) => prev.filter((p) => p.exercise.id !== deleteId))
      setDeleteId(null)
    })
  }

  function openPbForm(exId: number) {
    setPbExId(exId)
    setPbWeight("")
    setPbReps("1")
    setPbOpen(true)
  }

  function handleSavePb() {
    if (!pbExId || !pbWeight) return
    startTransition(async () => {
      await upsertPersonalBest({
        exerciseId: pbExId,
        weight: Number(pbWeight),
        reps: Number(pbReps),
      })
      // Refresh PBs list locally
      const ex = exercises.find((e) => e.id === pbExId)!
      setPbs((prev) => {
        const updated = prev.filter((p) => p.exercise.id !== pbExId)
        return [
          ...updated,
          {
            pb: {
              id: Date.now(),
              userId: "",
              exerciseId: pbExId,
              weight: pbWeight,
              reps: Number(pbReps),
              setAt: new Date(),
              createdAt: new Date(),
            },
            exercise: ex,
          },
        ].sort((a, b) => a.exercise.name.localeCompare(b.exercise.name))
      })
      setPbOpen(false)
    })
  }

  const pbMap = Object.fromEntries(
    [...pbs]
      .sort((a, b) => a.pb.createdAt.getTime() - b.pb.createdAt.getTime() || a.pb.id - b.pb.id)
      .map((p) => [p.exercise.id, p.pb])
  )

  return (
    <div className="space-y-4">
      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">Exercise Library</TabsTrigger>
          <TabsTrigger value="pbs">
            <Trophy className="w-3.5 h-3.5 mr-1.5" />
            Personal Bests
          </TabsTrigger>
        </TabsList>

        {/* Exercise Library tab */}
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

        {/* Personal Bests tab */}
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
      </Tabs>

      {/* Add Exercise Dialog */}
      <Dialog open={newExOpen} onOpenChange={setNewExOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
            <DialogDescription>Add a new exercise to the global library.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Bulgarian Split Squat" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Muscle group (optional)</Label>
              <Input placeholder="e.g. Legs" value={newMuscle} onChange={(e) => setNewMuscle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input placeholder="Brief description..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewExOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExercise} disabled={pending || !newName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set PB Dialog */}
      <Dialog open={pbOpen} onOpenChange={setPbOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Personal Best</DialogTitle>
            <DialogDescription>
              Record a manual PB for {exercises.find((e) => e.id === pbExId)?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.5" placeholder="e.g. 150" value={pbWeight} onChange={(e) => setPbWeight(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reps</Label>
              <Input type="number" min={1} value={pbReps} onChange={(e) => setPbReps(e.target.value)} />
            </div>
            {Number(pbWeight) > 0 && Number(pbReps) > 1 && (
              <p className="text-sm text-muted-foreground">
                Predicted 1RM: {Number(calculateOneRepMax(Number(pbWeight), Number(pbReps)).toFixed(1))} kg. Used for percentage-based default weights.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPbOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePb} disabled={pending || !pbWeight}>Save PB</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Exercise Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete exercise?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the exercise from the library. Existing workout logs will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExercise} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
