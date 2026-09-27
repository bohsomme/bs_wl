"use client"

import { useId, useState, useTransition } from "react"
import { Download } from "lucide-react"
import { exportProgramRun } from "@/lib/actions/program-export"
import { addDays, dateInZone } from "@/lib/program-export"
import type { Program } from "@/lib/db/schema"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ProgramExportDialog({ program }: { program: Pick<Program, "id" | "name" | "startDate" | "totalWeeks"> }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [timeZone, setTimeZone] = useState("UTC")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function changeOpen(value: boolean) {
    if (pending) return
    if (value) {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const start = program.startDate ?? dateInZone(new Date(), zone)
      setStartDate(start)
      setEndDate(addDays(start, program.totalWeeks * 7 - 1))
      setTimeZone(zone)
      setError("")
    }
    setOpen(value)
  }

  function download() {
    startTransition(async () => {
      setError("")
      try {
        const data = await exportProgramRun(program.id, { startDate, endDate, timeZone })
        const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        const name = program.name.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "program"
        anchor.download = `${name}_${startDate}_${endDate}.json`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        setOpen(false)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Could not export this run. Please try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Download className="h-4 w-4" /> Export run
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export {program.name}</DialogTitle>
          <DialogDescription>Download a JSON file with the program and workout logs for analysis in ChatGPT.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose the dates of one run. Start date is Day 1 of the program. Extend the end date to include any workouts finished late.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-start`}>Run start date</Label>
              <Input id={`${id}-start`} type="date" required value={startDate} disabled={pending} onChange={(e) => {
                setStartDate(e.target.value)
                if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && Number.isFinite(Date.parse(e.target.value))) setEndDate(addDays(e.target.value, program.totalWeeks * 7 - 1))
              }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-end`}>Include through</Label>
              <Input id={`${id}-end`} type="date" required min={startDate} value={endDate} disabled={pending} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Includes completed and in-progress workouts started within these dates, using {timeZone}. The full plan includes rest days and workouts with no logs.</p>
          <p className="text-xs text-muted-foreground">Older logs are compared with the current program. New workouts preserve their prescriptions when started. The JSON identifies which plan is available.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={pending || !startDate || !endDate || endDate < startDate} onClick={download}>
            <Download className="h-4 w-4" /> {pending ? "Exporting…" : "Download JSON"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
