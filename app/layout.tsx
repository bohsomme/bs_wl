import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const GA_MEASUREMENT_ID = "G-VF88LC5ERC"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BS Weightlifting",
  description: "Track your weightlifting programs, workouts, and personal bests.",
  generator: "v0.app",
  icons: {
    icon: "/wl_f_logo.png",
    apple: "/wl_f_logo.png",
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
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var theme="system";try{theme=localStorage.getItem("bs-wl-theme")||"system"}catch(e){}var dark=theme==="dark"||(theme!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.add(dark?"dark":"light")})()` }} />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.NODE_ENV === "production" && (
          <>
            <Analytics />
            <SpeedInsights />
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
