import { notFound } from "next/navigation"
import { getProgram, getWorkoutTemplates } from "@/lib/actions/programs"
import { getExercises } from "@/lib/actions/exercises"
import { ProgramBuilder } from "./program-builder"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProgramDetailPage({ params }: Props) {
  const { id } = await params
  const programId = Number(id)
  if (isNaN(programId)) notFound()

  const [p, templates, exercises] = await Promise.all([
    getProgram(programId),
    getWorkoutTemplates(programId),
    getExercises(),
  ])

  if (!p) notFound()

  return <ProgramBuilder program={p} initialTemplates={templates} exercises={exercises} />
}
