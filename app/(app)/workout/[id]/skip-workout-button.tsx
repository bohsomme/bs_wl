"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { skipWorkout } from "@/lib/actions/workouts"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog"

export function SkipWorkoutButton({ id, disabled }: { id: number; disabled: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function handleSkip() {
    if (pending) return
    setPending(true)
    setError("")
    try {
      await skipWorkout(id)
      router.replace(`/log/${id}`)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not skip the workout. Please try again.")
      setPending(false)
    }
  }

  return <AlertDialog open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError("") } }}>
    <AlertDialogTrigger render={<Button variant="outline" className="w-full" disabled={disabled || pending} />}>Skip workout</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Skip this workout?</AlertDialogTitle>
        <AlertDialogDescription>This workout will stay in your log marked as skipped, and your program will move on to the next workout. No check-in or other information is required.</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <AlertDialogAction disabled={pending} onClick={handleSkip}>{pending ? "Skipping..." : "Skip workout"}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
