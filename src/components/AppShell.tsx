import { useEffect, useState } from "react"
import { Moon, Sun, Zap } from "lucide-react"

import { useTheme } from "@/lib/useTheme"
import { cn } from "@/lib/utils"

import { OperatorSearch } from "./OperatorSearch"
import { RegionsRoute } from "./regions/RegionsRoute"

const navItems = ["Operators", "Regions", "Access"]
type NavItem = (typeof navItems)[number]

function activeItemFromUrl(): NavItem {
  if (typeof window === "undefined") {
    return "Operators"
  }

  return window.location.hash === "#regions" ||
    new URLSearchParams(window.location.search).has("state")
    ? "Regions"
    : "Operators"
}

function writeActiveItemToUrl(item: NavItem) {
  if (typeof window === "undefined") {
    return
  }

  const url = new URL(window.location.href)
  url.searchParams.delete("state")
  url.searchParams.delete("qa")
  url.hash = item === "Regions" ? "regions" : ""
  window.history.pushState(null, "", url)
}

export function AppShell() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const [activeItem, setActiveItem] = useState<NavItem>(activeItemFromUrl)

  useEffect(() => {
    const syncFromUrl = () => setActiveItem(activeItemFromUrl())

    window.addEventListener("popstate", syncFromUrl)
    window.addEventListener("hashchange", syncFromUrl)

    return () => {
      window.removeEventListener("popstate", syncFromUrl)
      window.removeEventListener("hashchange", syncFromUrl)
    }
  }, [])

  const selectItem = (item: NavItem) => {
    if (item === "Access") {
      return
    }

    setActiveItem(item)
    writeActiveItemToUrl(item)
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="grid h-14 flex-none grid-cols-[minmax(280px,1fr)_auto_minmax(280px,1fr)] items-center gap-2 border-b bg-background px-7 max-md:grid-cols-[minmax(0,1fr)_auto_auto] max-md:px-4">
        <button
          type="button"
          onClick={() => selectItem("Operators")}
          className="flex min-w-0 items-center gap-[11px] whitespace-nowrap text-[18px] font-normal tracking-[-0.01em] max-sm:text-[16px]"
          aria-label="EV Mobility Dashboard home"
        >
          <span className="flex size-7 flex-none items-center justify-center rounded-[9px] bg-muted text-[var(--dashboard-text-soft)]">
            <Zap className="size-3.5" strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="min-w-0 truncate max-[360px]:sr-only">
            EV Mobility Dashboard
          </span>
        </button>

        <nav aria-label="Primary" className="flex items-center gap-2.5 max-sm:gap-1">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => selectItem(item)}
              className={cn(
                "flex h-9 items-center justify-center rounded-[9px] px-3.5 text-sm leading-none transition-colors max-sm:px-2.5 max-sm:text-[13px]",
                activeItem === item
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                item === "Access" &&
                  "cursor-default hover:bg-transparent max-sm:hidden",
              )}
              aria-current={activeItem === item ? "page" : undefined}
              disabled={item === "Access"}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex size-9 items-center justify-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <Sun className="size-4" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Moon className="size-4" strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      <main className="flex min-h-0 min-w-0 flex-1">
        {activeItem === "Regions" ? <RegionsRoute /> : <OperatorSearch />}
      </main>
    </div>
  )
}
