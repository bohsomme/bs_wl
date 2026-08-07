import { redirect } from "next/navigation"
import { getSession } from "@/lib/actions/auth"
import { AuthForm } from "@/components/auth-form"

export default async function SignInPage() {
  const session = await getSession()
  if (session?.user) redirect("/dashboard")
  return <AuthForm mode="sign-in" />
}
