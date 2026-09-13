"use client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Dispatch, SetStateAction } from "react"

interface WorkoutCheckInProps {
  readiness: string
  setReadiness: Dispatch<SetStateAction<string>>
  barFeel: string
  setBarFeel: Dispatch<SetStateAction<string>>
  setCheckInStatus: Dispatch<SetStateAction<string>>
  preNotes: string
  setPreNotes: Dispatch<SetStateAction<string>>
  checkInStatus: string
  pending: boolean
  saveReadiness: (beginWorkout?: boolean) => Promise<void>
}

export function WorkoutCheckIn({
  readiness,
  setReadiness,
  barFeel,
  setBarFeel,
  setCheckInStatus,
  preNotes,
  setPreNotes,
  checkInStatus,
  pending,
  saveReadiness,
}: WorkoutCheckInProps) {
  return (
    <section aria-label="Workout check-in" className="rounded-xl border bg-background p-3 shadow-sm space-y-2">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Readiness", value: readiness, setValue: setReadiness },
          { label: "Bar feel", value: barFeel, setValue: setBarFeel },
        ].map(({ label, value, setValue }) => (
          <fieldset key={label} className="min-w-0 space-y-1">
            <legend className="text-sm font-medium">{label} (1-5)</legend>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button key={rating} type="button" aria-label={label + ": " + rating + " out of 5"}
                  aria-pressed={value === String(rating)}
                  onClick={() => { setValue(String(rating)); setCheckInStatus("Unsaved changes") }}
                  className={cn("h-11 rounded-lg text-sm font-medium border transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    value === String(rating) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent")}
                >{rating}</button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor="workout-check-in-notes">Notes (optional)</Label>
        <Textarea id="workout-check-in-notes" placeholder="How are you feeling? Soreness, stress, sleep..."
          rows={2} className="field-sizing-fixed h-16 resize-none" value={preNotes}
          onChange={(e) => { setPreNotes(e.target.value); setCheckInStatus("Unsaved changes") }} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p role="status" className="text-xs text-muted-foreground">{checkInStatus}</p>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => saveReadiness()}>Save check-in</Button>
      </div>
    </section>
  )
}
