"use client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Dispatch, SetStateAction } from "react"

interface FunctionalNotesFieldProps {
  functionalNotes: string
  setFunctionalNotes: Dispatch<SetStateAction<string>>
  setFunctionalNotesStatus: Dispatch<SetStateAction<string>>
  saveFunctionalNotes: () => void
  functionalNotesStatus: string
  pending: boolean
}

export function FunctionalNotesField({
  functionalNotes,
  setFunctionalNotes,
  setFunctionalNotesStatus,
  saveFunctionalNotes,
  functionalNotesStatus,
  pending,
}: FunctionalNotesFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="functional-notes">Functional Fitness notes</Label>
      <Textarea
        id="functional-notes"
        placeholder="RPE, Score and Notes"
        rows={3}
        value={functionalNotes}
        onChange={(e) => { setFunctionalNotes(e.target.value); setFunctionalNotesStatus("Unsaved changes") }}
        onBlur={saveFunctionalNotes}
      />
      <div className="flex items-center justify-between gap-2">
        <p role="status" className="text-xs text-muted-foreground">{functionalNotesStatus}</p>
        <Button size="sm" variant="outline" disabled={pending} onClick={saveFunctionalNotes}>Save notes</Button>
      </div>
    </div>
  )
}
