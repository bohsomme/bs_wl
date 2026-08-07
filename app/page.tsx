import { LandingClient } from "./landing/LandingClient"
import { getSession } from "@/lib/actions/auth"

export const metadata = {
  title: "BS-WL Coaching | Weightlifting Programs",
  description:
    "Choose your BS-WL weightlifting coaching program. Standard or Personalized — get structured training, coach access, and video review of your lifts.",
}

export default async function LandingPage() {
  // getSession() never throws — it returns null if the lookup fails — so the
  // public landing page always renders.
  const session = await getSession()
  return <LandingClient isAuthenticated={!!session?.user} />
}
