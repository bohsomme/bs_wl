"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type PlannedWorkout = { id: number; name: string; weekNumber: number; dayNumber: number; orderInDay: number }

// Calendar dates stay in UTC so daylight-saving changes never shift a workout.
function dateAt(start: string, offset = 0) {
  const date = new Date(`${start}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { ...options, timeZone: "UTC" })
}

export function ProgramCalendar({ program, templates, today: serverToday }: {
  program: { id: number; name: string; startDate: string; totalWeeks: number }
  templates: PlannedWorkout[]
  today: string
}) {
  const [today, setToday] = useState(serverToday)
  const end = dateAt(program.startDate, program.totalWeeks * 7 - 1)
  const initialDate = today < program.startDate ? program.startDate : today > end ? end : today
  const [selected, setSelected] = useState(initialDate)
  const [month, setMonth] = useState(initialDate.slice(0, 7) + "-01")
  useEffect(() => {
    const now = new Date()
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const initial = localToday < program.startDate ? program.startDate : localToday > end ? end : localToday
    setToday(localToday)
    setSelected(initial)
    setMonth(initial.slice(0, 7) + "-01")
  }, [program.startDate, end])
  const workouts = templates.map((template) => ({
    ...template,
    date: dateAt(program.startDate, (template.weekNumber - 1) * 7 + template.dayNumber - 1),
  })).sort((a, b) => a.date.localeCompare(b.date) || a.orderInDay - b.orderInDay || a.id - b.id)
  const first = new Date(`${month}T00:00:00Z`)
  const offset = (first.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const days = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => dateAt(month, i - offset))
  const selectedWorkouts = workouts.filter((workout) => workout.date === selected)

  function moveMonth(delta: number) {
    const date = new Date(`${month}T00:00:00Z`)
    date.setUTCMonth(date.getUTCMonth() + delta)
    const next = date.toISOString().slice(0, 10)
    setMonth(next)
    setSelected(next)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workout Calendar</CardTitle>
        <CardDescription>
          {program.name} &middot; {formatDate(program.startDate, { day: "numeric", month: "short", year: "numeric" })} – {formatDate(end, { day: "numeric", month: "short", year: "numeric" })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold" aria-live="polite">{formatDate(month, { month: "long", year: "numeric" })}</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => { setMonth(today.slice(0, 7) + "-01"); setSelected(today) }}>Today</Button>
            <Button variant="ghost" size="sm" onClick={() => { setMonth(program.startDate.slice(0, 7) + "-01"); setSelected(program.startDate) }}>Program start</Button>
            <Button variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft /></Button>
            <Button variant="outline" size="icon-sm" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight /></Button>
          </div>
        </div>
        <div>
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground" aria-hidden="true">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="py-2">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((date) => {
              const planned = workouts.filter((workout) => workout.date === date)
              return (
                <button key={date} type="button" onClick={() => { setSelected(date); setMonth(date.slice(0, 7) + "-01") }}
                  aria-pressed={selected === date} aria-current={date === today ? "date" : undefined}
                  aria-label={`${formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${planned.length} planned workouts${planned.length ? `: ${planned.map((w) => w.name).join(", ")}` : ""}`}
                  className={cn("min-w-0 rounded-md border p-1.5 text-left min-h-16 sm:min-h-24 sm:p-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring", date.slice(0, 7) !== month.slice(0, 7) && "opacity-40", selected === date && "border-primary bg-primary/5", date === today && "font-bold")}>
                  <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs", date === today && "bg-primary text-primary-foreground")}>{Number(date.slice(8))}</span>
                  {planned.length > 0 && <>
                    <span className="mt-1 block text-center text-xs text-primary sm:hidden">{planned.length} <span className="sr-only">workouts</span><span aria-hidden="true">●</span></span>
                    <span className="hidden sm:block space-y-1 mt-1">{planned.map((workout) => <span key={workout.id} className="block truncate rounded bg-primary/10 px-1 text-xs text-primary">{workout.name}</span>)}</span>
                  </>}
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-2" aria-live="polite">
          <h3 className="text-sm font-semibold">{formatDate(selected, { weekday: "long", day: "numeric", month: "long" })}</h3>
          {selectedWorkouts.length ? selectedWorkouts.map((workout) => (
            <div key={workout.id} className="rounded-lg border p-3">
              <p className="text-sm font-medium break-words">{workout.name}</p>
              <p className="text-xs text-muted-foreground">Week {workout.weekNumber} &middot; Day {workout.dayNumber}</p>
            </div>
          )) : <p className="text-sm text-muted-foreground">{templates.length === 0 ? "This program has no planned workouts yet." : selected < program.startDate || selected > end ? "Outside the assigned program dates." : "No workout planned. Rest day."}</p>}
        </div>
        <Button render={<Link href={`/programs/${program.id}`} />} variant="outline" size="sm">View program</Button>
      </CardContent>
    </Card>
  )
}
