import type { Metadata } from "next"
import { LandingClient } from "./landing/LandingClient"
import { getSession } from "@/lib/actions/auth"
import { siteDescription, siteTitle, siteUrl } from "@/lib/site"

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "BS-WL",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: "/wl_f_logo.png", alt: "BS Weightlifting" }],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/wl_f_logo.png"],
  },
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl.href}#website`,
      url: siteUrl.href,
      name: "BS-WL",
      alternateName: ["BS Weightlifting", "BS-weightlifting"],
      description: siteDescription,
      creator: { "@id": `${siteUrl.href}#coach` },
    },
    {
      "@type": "Person",
      "@id": `${siteUrl.href}#coach`,
      name: "Børge Olsen-Hagen Sømme",
      alternateName: "Børge Sømme",
      url: `${siteUrl.href}#coach`,
      jobTitle: "Weightlifting coach",
    },
  ],
}

export const dynamic = "force-dynamic"

export default async function LandingPage() {
  // getSession() never throws — it returns null if the lookup fails — so the
  // public landing page always renders.
  const session = await getSession()
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <LandingClient isAuthenticated={!!session?.user} />
    </>
  )
}
