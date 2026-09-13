"use client"
import { Button } from "@/components/ui/button"
import type { WorkoutTemplate } from "@/lib/db/schema"
import { Dumbbell, Plus, Trash2 } from "lucide-react"
import type { Dispatch, SetStateAction } from "react"

const DAYS = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`)

interface TemplateListProps {
  setAddTemplateOpen: Dispatch<SetStateAction<boolean>>
  weeks: number[]
  templates: WorkoutTemplate[]
  selectTemplate: (t: WorkoutTemplate) => void
  selectedTemplate: WorkoutTemplate | null
  handleDeleteTemplate: (id: number) => void
}

export function TemplateList({
  setAddTemplateOpen,
  weeks,
  templates,
  selectTemplate,
  selectedTemplate,
  handleDeleteTemplate,
}: TemplateListProps) {
  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Workouts</h2>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setAddTemplateOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {weeks.map((week) => {
        const weekTemplates = templates.filter((t) => t.weekNumber === week)
        return (
          <div key={week}>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Week {week}</p>
            {weekTemplates.length === 0 ? (
              <p className="text-xs text-muted-foreground italic pl-2">No workouts</p>
            ) : (
              <div className="space-y-1">
                {weekTemplates
                  .sort((a, b) => a.dayNumber - b.dayNumber)
                  .map((t) => (
                    <div
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors group ${selectedTemplate?.id === t.id
                        ? "bg-primary/15 text-foreground"
                        : "hover:bg-accent"
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Dumbbell className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{DAYS[t.dayNumber - 1]}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id) }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
