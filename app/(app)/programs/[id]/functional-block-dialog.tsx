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
import { Textarea } from "@/components/ui/textarea"
import { FUNCTIONAL_PRESETS, type FunctionalKind } from "@/lib/functional-fitness"
import type { Dispatch, SetStateAction } from "react"

const FUNCTIONAL_ITEMS = FUNCTIONAL_PRESETS.map((p) => ({ value: p.kind, label: p.label }))

interface FunctionalBlockDialogProps {
  ffOpen: boolean
  setFfOpen: Dispatch<SetStateAction<boolean>>
  resetFfForm: () => void
  ffKind: FunctionalKind
  setFfKind: Dispatch<SetStateAction<FunctionalKind>>
  ffTitle: string
  setFfTitle: Dispatch<SetStateAction<string>>
  ffSource: string
  setFfSource: Dispatch<SetStateAction<string>>
  ffDuration: string
  setFfDuration: Dispatch<SetStateAction<string>>
  ffDetails: string
  setFfDetails: Dispatch<SetStateAction<string>>
  handleAddFunctionalBlock: () => void
  pending: boolean
}

export function FunctionalBlockDialog({
  ffOpen,
  setFfOpen,
  resetFfForm,
  ffKind,
  setFfKind,
  ffTitle,
  setFfTitle,
  ffSource,
  setFfSource,
  ffDuration,
  setFfDuration,
  ffDetails,
  setFfDetails,
  handleAddFunctionalBlock,
  pending,
}: FunctionalBlockDialogProps) {
  return (
    <Dialog open={ffOpen} onOpenChange={(open) => { setFfOpen(open); if (!open) resetFfForm() }}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Functional Fitness</DialogTitle>
          <DialogDescription>
            Pick a type of workout, or choose Custom to type a specific one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select items={FUNCTIONAL_ITEMS} value={ffKind} onValueChange={(v) => setFfKind(v as FunctionalKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUNCTIONAL_PRESETS.map((p) => (
                  <SelectItem key={p.kind} value={p.kind}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{ffKind === "custom" ? "Specific workout" : "Label (optional)"}</Label>
            <Input
              placeholder={ffKind === "custom" ? "e.g. Fran, 21-15-9 thrusters & pull-ups" : "e.g. Rowing intervals 5×500m"}
              value={ffTitle}
              onChange={(e) => setFfTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Source (optional)</Label>
              <Input
                placeholder={FUNCTIONAL_PRESETS.find((p) => p.kind === ffKind)?.defaultSource ?? "e.g. Other app"}
                value={ffSource}
                onChange={(e) => setFfSource(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min, optional)</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 20"
                value={ffDuration}
                onChange={(e) => setFfDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Details (optional)</Label>
            <Textarea
              placeholder="Describe the workout, target pace, scaling, cues..."
              rows={3}
              value={ffDetails}
              onChange={(e) => setFfDetails(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setFfOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddFunctionalBlock}
            disabled={pending || (ffKind === "custom" && !ffTitle.trim())}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
