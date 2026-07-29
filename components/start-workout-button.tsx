"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { startWorkout, seedWorkoutFromTemplate } from "@/lib/actions/workouts"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"

interface StartWorkoutButtonProps {
  templateId: number
  programId: number
  workoutName: string
}

export function StartWorkoutButton({ templateId, programId, workoutName }: StartWorkoutButtonProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleStart() {
    startTransition(async () => {
      const log = await startWorkout({
        workoutTemplateId: templateId,
        programId,
        name: workoutName,
      })
      await seedWorkoutFromTemplate(log.id, templateId)
      router.push(`/workout/${log.id}`)
    })
  }

  return (
    <Button onClick={handleStart} disabled={pending} className="gap-2">
      <Play className="w-4 h-4" />
      {pending ? "Starting..." : "Start Workout"}
    </Button>
  )
}
