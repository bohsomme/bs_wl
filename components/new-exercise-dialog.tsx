"use client"
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
import type { Dispatch, SetStateAction } from "react"

interface NewExerciseDialogProps {
  newExOpen: boolean
  setNewExOpen: Dispatch<SetStateAction<boolean>>
  newExName: string
  setNewExName: Dispatch<SetStateAction<string>>
  newExMuscle: string
  setNewExMuscle: Dispatch<SetStateAction<string>>
  handleCreateExercise: () => Promise<void>
  pending: boolean
}

export function NewExerciseDialog({
  newExOpen,
  setNewExOpen,
  newExName,
  setNewExName,
  newExMuscle,
  setNewExMuscle,
  handleCreateExercise,
  pending,
}: NewExerciseDialogProps) {
  return (
    <Dialog open={newExOpen} onOpenChange={setNewExOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Exercise</DialogTitle>
          <DialogDescription>Add a new exercise to the global library.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input placeholder="e.g. Bulgarian Split Squat" value={newExName} onChange={(e) => setNewExName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Muscle group (optional)</Label>
            <Input placeholder="e.g. Legs" value={newExMuscle} onChange={(e) => setNewExMuscle(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setNewExOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateExercise} disabled={pending || !newExName.trim()}>Add Exercise</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
