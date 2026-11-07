import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { PlannedWorkoutOverview } from "@/components/planned-workout-overview"
import { getFunctionalBlocks, getPrograms, getTemplateExercises, getWorkoutTemplates } from "@/lib/actions/programs"
import { dateAt, programEnd } from "@/lib/program-schedule"

export default async function PlannedWorkoutsPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) notFound()

  // Only resolve templates from the signed-in user's assigned programs.
  const programs = (await getPrograms()).flatMap((program) => program.isActive && program.startDate
    && date >= program.startDate && date <= programEnd({ ...program, startDate: program.startDate })
    ? [{ ...program, startDate: program.startDate }] : [])
  const planned = (await Promise.all(programs.map(async (program) => {
    const templates = await getWorkoutTemplates(program.id)
    return templates.filter((template) => dateAt(program.startDate, (template.weekNumber - 1) * 7 + template.dayNumber - 1) === date)
      .map((template) => ({ template, programName: program.name }))
  }))).flat().sort((a, b) => a.template.orderInDay - b.template.orderInDay || a.template.id - b.template.id)
  if (!planned.length) notFound()

  const workouts = await Promise.all(planned.map(async (workout) => {
    const [exercises, functionalBlocks] = workout.template.isRestDay ? [[], []] : await Promise.all([
      getTemplateExercises(workout.template.id),
      getFunctionalBlocks(workout.template.id),
    ])
    return { ...workout, exercises, functionalBlocks }
  }))

  return <div className="mx-auto max-w-2xl space-y-6">
    <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm hover:underline"><ChevronLeft className="size-4" /> Back to calendar</Link>
    <div>
      <h1 className="text-xl font-bold">Planned workouts</h1>
      <p className="text-sm text-muted-foreground">{new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</p>
    </div>
    {workouts.map((workout) => <PlannedWorkoutOverview key={workout.template.id} {...workout} />)}
  </div>
}
