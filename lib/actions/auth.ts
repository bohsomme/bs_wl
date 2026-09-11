"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

export async function getSession() {
  // Never let a session lookup failure (e.g. transient DB issue) crash the
  // page. Callers treat a null session as "signed out".
  try {
    return await auth.api.getSession({ headers: await headers() })
  } catch (error) {
    // Next throws this internally during static-generation attempts on
    // routes that use dynamic APIs like headers(). It must be rethrown so
    // Next can correctly bail out to dynamic rendering — swallowing it here
    // would make Next think the route rendered successfully as static.
    if (error instanceof Error && (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE") {
      throw error
    }
    console.error("[v0] getSession failed:", error)
    return null
  }
}
