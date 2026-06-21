import { Zap } from "lucide-react"
import { OperatorSearch } from "./OperatorSearch"

const navItems = ["Operators", "Regions", "Access"]

export function AppShell() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="grid h-14 flex-none grid-cols-[minmax(280px,1fr)_auto_minmax(280px,1fr)] items-center border-b bg-background px-7 max-md:grid-cols-[1fr_auto] max-md:px-4">
        <a
          href="/"
          className="flex w-fit items-center gap-[11px] whitespace-nowrap text-[18px] font-normal tracking-[-0.01em] max-sm:text-[16px]"
          aria-label="EV Mobility Dashboard home"
        >
          <span className="flex size-7 items-center justify-center rounded-[9px] bg-muted text-[oklch(0.45_0_0)]">
            <Zap className="size-3.5" strokeWidth={2} aria-hidden="true" />
          </span>
          <span>EV Mobility Dashboard</span>
        </a>

        <nav aria-label="Primary" className="flex items-center gap-2.5">
          {navItems.map((item, index) => (
            <a
              key={item}
              href="#"
              className={[
                "flex h-9 items-center justify-center rounded-[9px] px-3.5 text-sm leading-none transition-colors",
                index === 0
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                index > 0 ? "max-sm:hidden" : "",
              ].join(" ")}
            >
              {item}
            </a>
          ))}
        </nav>

        <div className="max-md:hidden" aria-hidden="true" />
      </header>

      <main className="flex min-h-0 flex-1">
        <OperatorSearch />
      </main>
    </div>
  )
}
