"use client"
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
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { addExercise, deleteExercise, upsertPersonalBest } from "@/lib/actions/exercises"
import type { Exercise, PersonalBest } from "@/lib/db/schema"
import { Trophy } from "lucide-react"
import { useState, useTransition } from "react"
import { ExerciseLibraryTab } from "./exercise-library-tab"
import { PersonalBestDialog } from "./personal-best-dialog"
import { PersonalBestsTab } from "./personal-bests-tab"

type PbRow = {
  pb: PersonalBest
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
        <ExerciseLibraryTab
          search={search}
          setSearch={setSearch}
          setNewExOpen={setNewExOpen}
          groups={groups}
          filtered={filtered}
          pbMap={pbMap}
          openPbForm={openPbForm}
          setDeleteId={setDeleteId}
        />

        {/* Personal Bests tab */}
        <PersonalBestsTab
          pbs={pbs}
        />
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
      <PersonalBestDialog
        pbOpen={pbOpen}
        setPbOpen={setPbOpen}
        exercises={exercises}
        pbExId={pbExId}
        pbWeight={pbWeight}
        setPbWeight={setPbWeight}
        pbReps={pbReps}
        setPbReps={setPbReps}
        handleSavePb={handleSavePb}
        pending={pending}
      />

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
