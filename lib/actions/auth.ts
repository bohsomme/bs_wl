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
    console.error("[v0] getSession failed:", error)
    return null
  }
}
