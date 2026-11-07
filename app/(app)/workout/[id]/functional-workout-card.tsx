"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TemplateFunctionalBlock } from "@/lib/db/schema"
import { functionalHeading, type FunctionalResult } from "@/lib/functional-fitness"
import { Clock, Flame } from "lucide-react"
import type { ReactNode } from "react"

export function FunctionalWorkoutCard({ blocks, results = [], onOpen, pending, children }: {
  blocks: TemplateFunctionalBlock[]
  results?: FunctionalResult[]
  onOpen?: (index: number) => void
  pending?: boolean
  children?: ReactNode
}) {
  return (<Card className="border-primary/30 bg-primary/5">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-1.5">
        <Flame className="w-4 h-4 text-primary" /> Functional Fitness
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2.5">
      {blocks.map((b, index) => {
        const result = results.find((entry) => entry.blockId === b.id)
        return <div key={b.id} className="space-y-2 rounded-lg border p-3 break-words">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium">{functionalHeading(b)}</span>
            <Badge variant="outline" className="text-xs">{b.isProgrammed ? "Programmed" : "User-defined"}</Badge>
            {b.source && <Badge variant="secondary" className="text-xs">{b.source}</Badge>}
            {b.durationMin != null && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="w-3 h-3" /> {b.durationMin} min
              </Badge>
            )}
          </div>
          {b.details && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{b.details}</p>
          )}
          {(result?.workout || (b.isProgrammed && b.workout)) && <p className="text-sm whitespace-pre-wrap">{result?.workout || b.workout}</p>}
          {result?.scoreNotes && <p className="text-sm whitespace-pre-wrap">Score / notes: {result.scoreNotes}</p>}
          {result?.rpe != null && <p className="text-xs text-muted-foreground">RPE {result.rpe}</p>}
          {onOpen && <Button size="sm" variant="outline" disabled={pending} onClick={() => onOpen(index)} aria-label={`Open ${functionalHeading(b)}`}>{result ? "View / edit result" : "Open workout"}</Button>}
        </div>
      })}
      {children}
    </CardContent>
  </Card>)
}
