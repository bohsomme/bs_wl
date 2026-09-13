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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Exercise } from "@/lib/db/schema"
import {
  Plus
} from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

interface AddSessionExerciseDialogProps {
  addExOpen: boolean
  setAddExOpen: Dispatch<SetStateAction<boolean>>
  localExercises: Exercise[]
  selectedAddExId: number | null
  setSelectedAddExId: Dispatch<SetStateAction<number | null>>
  setNewExOpen: Dispatch<SetStateAction<boolean>>
  handleAddExercise: () => Promise<void>
  pending: boolean
}

export function AddSessionExerciseDialog({
  addExOpen,
  setAddExOpen,
  localExercises,
  selectedAddExId,
  setSelectedAddExId,
  setNewExOpen,
  handleAddExercise,
  pending,
}: AddSessionExerciseDialogProps) {
  return (
    <Dialog open={addExOpen} onOpenChange={setAddExOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Exercise</DialogTitle>
          <DialogDescription>Add an exercise to this workout session.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Exercise</Label>
            <div className="flex gap-2">
              <Select
                items={localExercises.map((ex) => ({ value: String(ex.id), label: ex.name }))}
                value={selectedAddExId !== null ? String(selectedAddExId) : null}
                onValueChange={(v) => setSelectedAddExId(v === null ? null : Number(v))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select exercise..." />
                </SelectTrigger>
                <SelectContent>
                  {localExercises.map((ex) => (
                    <SelectItem key={ex.id} value={String(ex.id)}>{ex.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setNewExOpen(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddExOpen(false)}>Cancel</Button>
          <Button onClick={handleAddExercise} disabled={pending || !selectedAddExId}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
