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
import { cn } from "@/lib/utils"
import type { Dispatch, SetStateAction } from "react"

const FUNCTIONAL_ITEMS = FUNCTIONAL_PRESETS.map((p) => ({ value: p.kind, label: p.label }))

interface FunctionalBlockDialogProps {
  ffIsProgrammed: boolean
  setFfIsProgrammed: Dispatch<SetStateAction<boolean>>
  ffWorkout: string
  setFfWorkout: Dispatch<SetStateAction<string>>
  editing: boolean
  error: string
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
  ffIsProgrammed, setFfIsProgrammed, ffWorkout, setFfWorkout,
  editing, error,
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
    <Dialog open={ffOpen} onOpenChange={(open) => { if (pending) return; setFfOpen(open); if (!open) resetFfForm() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "Add"} Functional Fitness</DialogTitle>
          <DialogDescription>
            Let the athlete choose the workout, or set a programmed workout in advance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="functional-title">{ffKind === "custom" ? "Title" : "Title (optional)"}</Label>
            <Input
              id="functional-title"
              placeholder={ffKind === "custom" ? "e.g. Fran" : "e.g. Rowing intervals"}
              value={ffTitle}
              onChange={(e) => setFfTitle(e.target.value)}
            />
          </div>
          <fieldset className="space-y-2" disabled={pending}>
            <legend className="text-sm font-medium mb-2">Workout programming</legend>
            {[{ value: false, label: "Free choice", hint: "The athlete fills in the workout when training." },
              { value: true, label: "Programmed workout", hint: "Set the workout now. It is read-only when training." }].map((option) => (
              <button
                key={String(option.value)}
                type="button"
                aria-pressed={ffIsProgrammed === option.value}
                disabled={pending}
                onClick={() => setFfIsProgrammed(option.value)}
                className={cn(
                  "block w-full rounded-lg border p-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                  ffIsProgrammed === option.value ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-background hover:bg-accent"
                )}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </fieldset>
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
          {ffIsProgrammed && <div className="space-y-1.5">
            <Label htmlFor="programmed-functional-workout">Workout</Label>
            <Textarea id="programmed-functional-workout" rows={5} value={ffWorkout} onChange={(e) => setFfWorkout(e.target.value)} placeholder="e.g. 5 rounds for time: 400 m run, 15 kettlebell swings, 10 pull-ups" />
          </div>}

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
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Target pace, scaling guidance, cues..."
              rows={3}
              value={ffDetails}
              onChange={(e) => setFfDetails(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button variant="outline" disabled={pending} onClick={() => { setFfOpen(false); resetFfForm() }}>Cancel</Button>
          <Button
            onClick={handleAddFunctionalBlock}
            disabled={pending || (ffKind === "custom" && !ffTitle.trim()) || (ffIsProgrammed && !ffWorkout.trim())}
          >
            {pending ? "Saving..." : editing ? "Save changes" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
