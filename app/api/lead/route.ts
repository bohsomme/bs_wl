import { NextResponse } from "next/server"

const PROGRAM_LABELS: Record<string, string> = {
  standard: "BS-WL Standard (250 NOK/month)",
  personalized: "BS-WL Personalized (500 NOK/month)",
}

export async function POST(req: Request) {
  const { name, email, program } = await req.json()

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const toEmail = process.env.LEAD_NOTIFICATION_EMAIL

  if (!apiKey || !toEmail) {
    // Log to server so the coach can still see the lead even without email configured
    console.log("[BS-WL Lead]", { name, email, program })
    return NextResponse.json({ ok: true })
  }

  const programLabel = PROGRAM_LABELS[program] ?? program

  const html = `
    <h2>New lead — BS-WL</h2>
    <table cellpadding="8" style="border-collapse:collapse;font-family:sans-serif;font-size:15px;">
      <tr><td style="color:#666">Program</td><td><strong>${programLabel}</strong></td></tr>
      <tr><td style="color:#666">Name</td><td>${name || "—"}</td></tr>
      <tr><td style="color:#666">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
    </table>
  `

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "BS-WL <onboarding@bs-weightlifting.com>",
      to: [toEmail],
      subject: `New lead: ${programLabel}`,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error("[BS-WL Lead] Resend error:", body)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
