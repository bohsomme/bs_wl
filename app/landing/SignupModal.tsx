"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle } from "lucide-react"
import type { Locale } from "./translations"
import { translations } from "./translations"

interface SignupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  program: "standard" | "personalized" | null
  locale: Locale
}

export function SignupModal({ open, onOpenChange, program, locale }: SignupModalProps) {
  const t = translations[locale]
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const programName = program === "standard" ? t.option1Title : t.option2Title

  function handleClose(open: boolean) {
    if (!open) {
      setName("")
      setEmail("")
      setError("")
      setStatus("idle")
    }
    onOpenChange(open)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError(t.required)
      return
    }

    setStatus("loading")

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, program }),
      })

      if (!res.ok) throw new Error()
      setStatus("success")
    } catch {
      setStatus("error")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle className="h-12 w-12 text-primary" />
            <div>
              <h3 className="text-lg font-semibold">{t.successTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.successMessage}</p>
            </div>
            <Button onClick={() => handleClose(false)} className="mt-2 w-full">
              {t.cancel}
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {t.modalTitle} {programName}
              </DialogTitle>
              <DialogDescription>{t.modalSubtitle}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">{t.nameLabel}</Label>
                <Input
                  id="name"
                  placeholder={t.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={status === "loading"}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">
                  {t.emailLabel} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                  }}
                  disabled={status === "loading"}
                  aria-invalid={!!error}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              {status === "error" && (
                <p className="text-sm text-destructive">{t.errorMessage}</p>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleClose(false)}
                  disabled={status === "loading"}
                >
                  {t.cancel}
                </Button>
                <Button type="submit" className="flex-1" disabled={status === "loading"}>
                  {status === "loading" ? t.submitting : t.submit}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
