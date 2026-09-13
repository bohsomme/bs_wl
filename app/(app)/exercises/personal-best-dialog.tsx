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
import type { Exercise } from "@/lib/db/schema"
import { calculateOneRepMax } from "@/lib/strength"
import type { Dispatch, SetStateAction } from "react"

interface PersonalBestDialogProps {
  pbOpen: boolean
  setPbOpen: Dispatch<SetStateAction<boolean>>
  exercises: Exercise[]
  pbExId: number | null
  pbWeight: string
  setPbWeight: Dispatch<SetStateAction<string>>
  pbReps: string
  setPbReps: Dispatch<SetStateAction<string>>
  handleSavePb: () => void
  pending: boolean
}

export function PersonalBestDialog({
  pbOpen,
  setPbOpen,
  exercises,
  pbExId,
  pbWeight,
  setPbWeight,
  pbReps,
  setPbReps,
  handleSavePb,
  pending,
}: PersonalBestDialogProps) {
  return (
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
  )
}
