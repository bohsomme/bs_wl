"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({ theme: "system", setTheme: () => {} })
const storageKey = "bs-wl-theme"
const validTheme = (value: string | null): Theme => value === "light" || value === "dark" ? value : "system"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, updateTheme] = useState<Theme>("system")

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    let preference: Theme = "system"
    try { preference = validTheme(localStorage.getItem(storageKey)) } catch {}
    const apply = () => {
      const dark = preference === "dark" || (preference === "system" && media.matches)
      document.documentElement.classList.toggle("dark", dark)
      document.documentElement.classList.toggle("light", !dark)
      updateTheme(preference)
    }
    const change = (event: Event) => {
      if (event instanceof StorageEvent) {
        if (event.key !== storageKey && event.key !== null) return
        preference = validTheme(event.newValue)
      } else if (event instanceof CustomEvent) {
        preference = validTheme(event.detail)
      }
      apply()
    }
    apply()
    media.addEventListener("change", apply)
    window.addEventListener("storage", change)
    window.addEventListener("theme-change", change)
    return () => {
      media.removeEventListener("change", apply)
      window.removeEventListener("storage", change)
      window.removeEventListener("theme-change", change)
    }
  }, [])

  function setTheme(value: Theme) {
    try { localStorage.setItem(storageKey, value) } catch {}
    window.dispatchEvent(new CustomEvent("theme-change", { detail: value }))
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
