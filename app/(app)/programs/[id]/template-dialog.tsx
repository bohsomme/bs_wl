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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Dispatch, SetStateAction } from "react"

const DAYS = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`)

const DAY_ITEMS = DAYS.map((label, i) => ({ value: String(i + 1), label }))

interface TemplateDialogProps {
  addTemplateOpen: boolean
  setAddTemplateOpen: Dispatch<SetStateAction<boolean>>
  newTemplateName: string
  setNewTemplateName: Dispatch<SetStateAction<string>>
  weeks: number[]
  newTemplateWeek: number
  setNewTemplateWeek: Dispatch<SetStateAction<number>>
  newTemplateDay: number
  setNewTemplateDay: Dispatch<SetStateAction<number>>
  handleAddTemplate: () => void
  pending: boolean
}

export function TemplateDialog({
  addTemplateOpen,
  setAddTemplateOpen,
  newTemplateName,
  setNewTemplateName,
  weeks,
  newTemplateWeek,
  setNewTemplateWeek,
  newTemplateDay,
  setNewTemplateDay,
  handleAddTemplate,
  pending,
}: TemplateDialogProps) {
  return (
    <Dialog open={addTemplateOpen} onOpenChange={setAddTemplateOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Workout</DialogTitle>
          <DialogDescription>Create a new workout session for this program.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Workout name</Label>
            <Input
              placeholder="e.g. Lower A, Upper, Pull Day"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Week</Label>
              <Select items={weeks.map((w) => ({ value: String(w), label: `Week ${w}` }))} value={String(newTemplateWeek)} onValueChange={(v) => setNewTemplateWeek(Number(v))}>
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
              <Select items={DAY_ITEMS} value={String(newTemplateDay)} onValueChange={(v) => setNewTemplateDay(Number(v))}>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddTemplateOpen(false)}>Cancel</Button>
          <Button onClick={handleAddTemplate} disabled={pending || !newTemplateName.trim()}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
