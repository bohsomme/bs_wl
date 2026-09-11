"use client"

import { useState } from "react"
import { BrandLogo } from "@/components/brand-logo"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AuthFormProps {
  mode: "sign-in" | "sign-up"
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === "sign-up") {
        const res = await authClient.signUp.email({ email, password, name })
        if (res.error) throw new Error(res.error.message ?? "Sign up failed")
      } else {
        const res = await authClient.signIn.email({ email, password })
        if (res.error) throw new Error(res.error.message ?? "Sign in failed")
      }
      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <BrandLogo />
          </div>
          <CardTitle className="text-2xl">
            {mode === "sign-in" ? "Welcome back" : "Create account"}
          </CardTitle>
          <CardDescription>
            {mode === "sign-in"
              ? "Sign in to your account to continue"
              : "Start tracking your lifts today"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "sign-up" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {mode === "sign-in" ? (
              <>
                Don&apos;t have an account?{" "}
                <a href="/sign-up" className="text-primary hover:underline">
                  Sign up
                </a>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <a href="/sign-in" className="text-primary hover:underline">
                  Sign in
                </a>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
