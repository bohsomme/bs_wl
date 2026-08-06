"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Check, MessageCircle, Video, Calendar, Dumbbell } from "lucide-react"
import { SignupModal } from "./SignupModal"
import type { Locale } from "./translations"
import { translations } from "./translations"

export function LandingClient() {
  const [locale, setLocale] = useState<Locale>("en")
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<"standard" | "personalized" | null>(null)

  const t = translations[locale]

  function openModal(program: "standard" | "personalized") {
    setSelectedProgram(program)
    setModalOpen(true)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="text-xl font-bold tracking-tight text-foreground">
            BS<span className="text-primary">-Weightlifting</span>
          </span>

          <div className="flex items-center gap-4">
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {t.appComingSoon}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  {locale === "en" ? "EN" : "NO"}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLocale("en")} className="flex items-center justify-between gap-6">
                  English
                  {locale === "en" && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocale("no")} className="flex items-center justify-between gap-6">
                  Norsk
                  {locale === "no" && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16 text-center">
        <h1 className="text-pretty text-4xl font-bold tracking-tight sm:text-5xl">{t.tagline}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{t.subtitle}</p>
      </section>

      {/* Program Cards */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Option 1 — Standard */}
          <article className="flex flex-col rounded-xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md min-h-[480px]">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold">{t.option1Title}</h2>
              <Badge variant="secondary" className="shrink-0">
                {t.option1Badge}
              </Badge>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">{t.option1Price}</span>
              <span className="text-sm text-muted-foreground">{t.option1Period}</span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.option1Description}</p>

            <ul className="mt-6 flex flex-col gap-3">
              <FeatureItem icon={<Dumbbell className="h-4 w-4" />} text={t.option1Feature1} />
              <FeatureItem icon={<MessageCircle className="h-4 w-4" />} text={t.option1Feature2} />
              <FeatureItem icon={<Video className="h-4 w-4" />} text={t.option1Feature3} />
            </ul>

            <div className="mt-auto pt-8">
              <Button size="lg" className="w-full" onClick={() => openModal("standard")}>
                {t.option1CTA}
              </Button>
            </div>
          </article>

          {/* Option 2 — Personalized */}
          <article className="relative flex flex-col rounded-xl border-2 border-primary bg-card p-8 shadow-sm transition-shadow hover:shadow-md min-h-[480px]">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-semibold">{t.option2Title}</h2>
              <Badge className="shrink-0">{t.option2Badge}</Badge>
            </div>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">{t.option2Price}</span>
              <span className="text-sm text-muted-foreground">{t.option2Period}</span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.option2Description}</p>

            <ul className="mt-6 flex flex-col gap-3">
              <FeatureItem icon={<Dumbbell className="h-4 w-4" />} text={t.option2Feature1} />
              <FeatureItem icon={<Calendar className="h-4 w-4" />} text={t.option2Feature2} />
              <FeatureItem icon={<MessageCircle className="h-4 w-4" />} text={t.option2Feature3} />
              <FeatureItem icon={<Video className="h-4 w-4" />} text={t.option2Feature4} />
            </ul>

            <div className="mt-auto pt-8">
              <Button size="lg" className="w-full" onClick={() => openModal("personalized")}>
                {t.option2CTA}
              </Button>
            </div>
          </article>
        </div>
      </main>

      <SignupModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        program={selectedProgram}
        locale={locale}
      />
    </div>
  )
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-foreground">
      <span className="shrink-0 text-primary">{icon}</span>
      {text}
    </li>
  )
}
