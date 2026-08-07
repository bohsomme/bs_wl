import { LandingClient } from "./landing/LandingClient"
import { getSession } from "@/lib/actions/auth"

export const metadata = {
  title: "BS-WL Coaching | Weightlifting Programs",
  description:
    "Choose your BS-WL weightlifting coaching program. Standard or Personalized — get structured training, coach access, and video review of your lifts.",
}

export default async function LandingPage() {
  // The landing page is public and must always render, even if the session
  // lookup fails (e.g. transient DB issue). Never let it 500.
  let isAuthenticated = false
  try {
    const session = await getSession()
    isAuthenticated = !!session?.user
  } catch (error) {
    console.error("[v0] Landing page session lookup failed:", error)
  }
  return <LandingClient isAuthenticated={isAuthenticated} />
}
