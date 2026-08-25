import { redirect } from "next/navigation"
import { getSession } from "@/lib/actions/auth"
import { Nav } from "@/components/nav"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect("/sign-in")

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav userName={session.user.name ?? session.user.email} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
