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
import type { WorkoutTemplate } from "@/lib/db/schema"
import type { Dispatch, SetStateAction } from "react"

const DAYS = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`)

const DAY_ITEMS = DAYS.map((label, i) => ({ value: String(i + 1), label }))

interface DuplicateDayDialogProps {
  dupOpen: boolean
  setDupOpen: Dispatch<SetStateAction<boolean>>
  selectedTemplate: WorkoutTemplate | null
  weeks: number[]
  dupWeek: number
  setDupWeek: Dispatch<SetStateAction<number>>
  dupDay: number
  setDupDay: Dispatch<SetStateAction<number>>
  handleDuplicateDay: () => void
  pending: boolean
}

export function DuplicateDayDialog({
  dupOpen,
  setDupOpen,
  selectedTemplate,
  weeks,
  dupWeek,
  setDupWeek,
  dupDay,
  setDupDay,
  handleDuplicateDay,
  pending,
}: DuplicateDayDialogProps) {
  return (
    <Dialog open={dupOpen} onOpenChange={setDupOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Training Day</DialogTitle>
          <DialogDescription>
            Copy {selectedTemplate?.name} — including exercises and functional work — to another week and day.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>Week</Label>
            <Select items={weeks.map((w) => ({ value: String(w), label: `Week ${w}` }))} value={String(dupWeek)} onValueChange={(v) => setDupWeek(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((w) => (
                  <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Day</Label>
            <Select items={DAY_ITEMS} value={String(dupDay)} onValueChange={(v) => setDupDay(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDupOpen(false)}>Cancel</Button>
          <Button onClick={handleDuplicateDay} disabled={pending}>Duplicate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
