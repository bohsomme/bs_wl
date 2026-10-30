"use client"

import { useRef, useState } from "react"
import { Combobox } from "@base-ui/react/combobox"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Exercise } from "@/lib/db/schema"

export function ExercisePicker({ exercises, value, onValueChange, id, disabled }: {
  exercises: Exercise[]
  value: number | null
  onValueChange: (value: number | null) => void
  id?: string
  disabled?: boolean
}) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  return <Combobox.Root
    items={exercises}
    value={exercises.find((exercise) => exercise.id === value) ?? null}
    onValueChange={(exercise) => onValueChange(exercise?.id ?? null)}
    itemToStringLabel={(exercise) => exercise.name}
    isItemEqualToValue={(a, b) => a.id === b.id}
    inputValue={query}
    onInputValueChange={setQuery}
    onOpenChange={() => setQuery("")}
    disabled={disabled}
    autoHighlight
  >
    <Combobox.Trigger id={id} aria-label="Exercise" render={<Button variant="outline" className="w-full min-w-0 justify-between font-normal" />}>
      <span className="truncate"><Combobox.Value placeholder="Select exercise..." /></span>
      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
    </Combobox.Trigger>
    <Combobox.Portal>
      <Combobox.Positioner sideOffset={4} className="z-50">
        <Combobox.Popup initialFocus={inputRef} className="w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <Combobox.Input ref={inputRef} render={<Input />} aria-label="Search exercises" placeholder="Search exercises..." className="mb-1" />
          <Combobox.Empty className="p-3 text-sm text-muted-foreground">No exercises found.</Combobox.Empty>
          <Combobox.List className="max-h-64 overflow-y-auto overscroll-contain">
            {(exercise: Exercise) => <Combobox.Item key={exercise.id} value={exercise} className="flex cursor-default items-center justify-between gap-2 rounded-sm px-2 py-2 text-sm data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
              {exercise.name}<Combobox.ItemIndicator><Check className="size-4" /></Combobox.ItemIndicator>
            </Combobox.Item>}
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  </Combobox.Root>
}
