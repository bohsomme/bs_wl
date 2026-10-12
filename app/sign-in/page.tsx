import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/actions/auth"
import { AuthForm } from "@/components/auth-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Sign in | BS-WL",
  robots: { index: false, follow: false },
}

export default async function SignInPage() {
  const session = await getSession()
  if (session?.user) redirect("/dashboard")
  return <AuthForm mode="sign-in" />
}
