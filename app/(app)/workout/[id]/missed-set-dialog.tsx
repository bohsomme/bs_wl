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
import {
  AlertTriangle
} from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

interface MissedSetDialogProps {
  missModalKey: string | null
  setMissModalKey: Dispatch<SetStateAction<string | null>>
  missReason: Record<string, string>
  setMissReason: Dispatch<SetStateAction<Record<string, string>>>
  saveError: string | null
  pending: boolean
  saveSet: (elId: number, setNum: number, isMakeup?: boolean, missed?: boolean, addMakeup?: boolean) => void
}

export function MissedSetDialog({
  missModalKey,
  setMissModalKey,
  missReason,
  setMissReason,
  saveError,
  pending,
  saveSet,
}: MissedSetDialogProps) {
  return (
    <Dialog open={!!missModalKey} onOpenChange={(open) => { if (!open) setMissModalKey(null) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Set missed
          </DialogTitle>
          <DialogDescription>
            Optionally add a reason for the miss. You can also add a makeup set.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="e.g. Form breakdown, too heavy..."
              value={missModalKey ? (missReason[missModalKey] ?? "") : ""}
              onChange={(e) => {
                if (!missModalKey) return
                setMissReason((prev) => ({ ...prev, [missModalKey]: e.target.value }))
              }}
            />
          </div>
        </div>
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (missModalKey) {
                const parts = missModalKey.split("-")
                const elId = Number(parts[0])
                const setNum = Number(parts[1])
                saveSet(elId, setNum, parts[2] === "m", true)
              }
            }}
          >
            Save Miss
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              if (missModalKey) {
                const parts = missModalKey.split("-")
                const elId = Number(parts[0])
                const setNum = Number(parts[1])
                saveSet(elId, setNum, parts[2] === "m", true, true)
              }
            }}
          >
            Save &amp; Add Makeup Set
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
