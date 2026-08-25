import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import "./globals.css"

const GA_MEASUREMENT_ID = "G-VF88LC5ERC"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BS Weightlifting",
  description: "Track your weightlifting programs, workouts, and personal bests.",
  generator: "v0.app",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1b27" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.className} antialiased`}>
        {children}
        {process.env.NODE_ENV === "production" && (
          <>
            <Analytics />
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
