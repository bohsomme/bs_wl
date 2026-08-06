import { LandingClient } from "./landing/LandingClient"

export const metadata = {
  title: "BS-WL Coaching | Weightlifting Programs",
  description:
    "Choose your BS-WL weightlifting coaching program. Standard or Personalized — get structured training, coach access, and video review of your lifts.",
}

export default function LandingPage() {
  return <LandingClient />
}
