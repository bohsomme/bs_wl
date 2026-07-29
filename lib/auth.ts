import { betterAuth } from "better-auth"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const productionUrl = process.env.BETTER_AUTH_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined)
  ?? (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined)
  ?? process.env.V0_RUNTIME_URL
  ?? "http://localhost:3000"

const isDev = process.env.NODE_ENV === "development"

// In development (v0 preview iframe), accept any origin.
// In production, restrict to known URLs.
const staticTrustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.V0_RUNTIME_URL,
  "http://localhost:3000",
].filter(Boolean) as string[]

export const auth = betterAuth({
  database: pool,
  baseURL: productionUrl,
  // Accept any origin in dev; wildcard pattern covers the v0 preview iframe
  trustedOrigins: isDev
    ? ["*://*"]
    : staticTrustedOrigins,
  emailAndPassword: { enabled: true },
  advanced: {
    // Cross-site iframe in the v0 preview requires SameSite=None; Secure
    defaultCookieAttributes: isDev
      ? { sameSite: "none" as const, secure: true }
      : undefined,
    // Skip CSRF origin check in dev so the preview iframe can auth
    disableCSRFCheck: isDev,
  },
})
