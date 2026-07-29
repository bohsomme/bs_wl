import { getPrograms } from "@/lib/actions/programs"
import { ProgramList } from "./program-list"

export default async function ProgramsPage() {
  const programs = await getPrograms()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your training programs and weekly templates.
        </p>
      </div>
      <ProgramList initialPrograms={programs} />
    </div>
  )
}
