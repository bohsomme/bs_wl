"use client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TemplateFunctionalBlock } from "@/lib/db/schema"
import { functionalHeading } from "@/lib/functional-fitness"
import { Clock, Flame } from "lucide-react"
import type { ReactNode } from "react"

export function FunctionalWorkoutCard({ blocks, children }: { blocks: TemplateFunctionalBlock[]; children: ReactNode }) {
  return (<Card className="border-primary/30 bg-primary/5">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-1.5">
        <Flame className="w-4 h-4 text-primary" /> Functional Fitness
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2.5">
      {blocks.map((b) => (
        <div key={b.id} className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium">{functionalHeading(b)}</span>
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
        </div>
      ))}
      {children}
    </CardContent>
  </Card>)
}
