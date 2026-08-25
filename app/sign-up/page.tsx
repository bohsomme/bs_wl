import { redirect } from "next/navigation"
import { getSession } from "@/lib/actions/auth"
import { AuthForm } from "@/components/auth-form"

export const dynamic = "force-dynamic"

export default async function SignUpPage() {
  const session = await getSession()
  if (session?.user) redirect("/dashboard")
  return <AuthForm mode="sign-up" />
}
