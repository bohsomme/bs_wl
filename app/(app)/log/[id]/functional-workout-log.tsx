import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TemplateFunctionalBlock } from "@/lib/db/schema"
import { functionalHeading, type FunctionalResult } from "@/lib/functional-fitness"

export function FunctionalWorkoutLog({ blocks, results }: { blocks: TemplateFunctionalBlock[]; results: FunctionalResult[] }) {
  const ids = [...blocks.map((block) => block.id), ...results.filter((result) => !blocks.some((block) => block.id === result.blockId)).map((result) => result.blockId)]
  if (!ids.length) return null
  return <section className="space-y-3">
    <h2 className="font-semibold">Functional Fitness</h2>
    {ids.map((id) => {
      const block = blocks.find((block) => block.id === id)
      const result = results.find((entry) => entry.blockId === id)
      return <Card key={id}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{block ? functionalHeading(block) : "Functional workout"}</CardTitle>
          {block && <Badge variant="outline">{block.isProgrammed ? "Programmed workout" : "User-defined workout"}</Badge>}
          {block?.details && <p className="text-sm whitespace-pre-wrap">{block.details}</p>}
        </CardHeader>
        <CardContent className="space-y-3">
          <div><p className="text-xs font-medium text-muted-foreground mb-1">Workout</p><p className="text-sm whitespace-pre-wrap">{result?.workout || (block?.isProgrammed && block.workout) || "Not recorded"}</p></div>
          <div><p className="text-xs font-medium text-muted-foreground mb-1">Score / notes</p><p className="text-sm whitespace-pre-wrap">{result?.scoreNotes || "Not recorded"}</p></div>
          <div><p className="text-xs font-medium text-muted-foreground mb-1">RPE</p><p className="text-sm">{result?.rpe ?? "Not recorded"}</p></div>
        </CardContent>
      </Card>
    })}
  </section>
}
