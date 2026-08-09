"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createProgram, deleteProgram, duplicateProgram, setActiveProgram } from "@/lib/actions/programs"
import type { Program } from "@/lib/db/schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Copy, Trash2, ChevronRight, Zap } from "lucide-react"

interface ProgramListProps {
  initialPrograms: Program[]
}

export function ProgramList({ initialPrograms }: ProgramListProps) {
  const router = useRouter()
  const [programs, setPrograms] = useState(initialPrograms)
  const [pending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [totalWeeks, setTotalWeeks] = useState(4)

  function handleCreate() {
    if (!name.trim()) return
    startTransition(async () => {
      const p = await createProgram({ name: name.trim(), description: description.trim() || undefined, totalWeeks })
      setPrograms((prev) => [...prev, p])
      setName("")
      setDescription("")
      setTotalWeeks(4)
      setCreateOpen(false)
    })
  }

  function handleDuplicate(id: number) {
    startTransition(async () => {
      const p = await duplicateProgram(id)
      setPrograms((prev) => [...prev, p])
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteProgram(id)
      setPrograms((prev) => prev.filter((p) => p.id !== id))
    })
  }

  function handleSetActive(id: number) {
    startTransition(async () => {
      await setActiveProgram(id)
      setPrograms((prev) =>
        prev.map((p) => ({ ...p, isActive: p.id === id }))
      )
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button className="gap-2" />}>
            <Plus className="w-4 h-4" /> New Program
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Program</DialogTitle>
              <DialogDescription>Set up a new training program with weekly workouts.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Program name</Label>
                <Input
                  placeholder="e.g. Powerbuilding Block 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Goals, notes, focus..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total weeks</Label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={totalWeeks}
                  onChange={(e) => setTotalWeeks(Number(e.target.value))}
                  className="w-24"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={pending || !name.trim()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {programs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No programs yet</p>
              <p className="text-muted-foreground text-sm">Create your first training program to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <Card key={p.id} className={p.isActive ? "border-primary/50 bg-primary/5" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{p.name}</CardTitle>
                    {p.description && (
                      <CardDescription className="text-xs line-clamp-1">{p.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.isActive && (
                      <Badge className="text-xs gap-1">
                        <Zap className="w-3 h-3" /> Active
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!p.isActive && (
                          <DropdownMenuItem onClick={() => handleSetActive(p.id)}>
                            <Zap className="w-4 h-4 mr-2" /> Set as active
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDuplicate(p.id)}>
                          <Copy className="w-4 h-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(p.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  {p.totalWeeks} week{p.totalWeeks !== 1 ? "s" : ""}
                </p>
                <Button render={<Link href={`/programs/${p.id}`} />} variant="outline" size="sm" className="w-full gap-1.5">
                  View &amp; Edit <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
