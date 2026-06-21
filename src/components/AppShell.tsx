import { Fuel } from "lucide-react"
import { OperatorSearch } from "./OperatorSearch"

const navItems = ["Operators", "Regions", "Access"]

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="grid h-14 grid-cols-[minmax(320px,1fr)_auto_minmax(320px,1fr)] items-center border-b bg-card px-10">
        <a
          href="/"
          className="flex w-fit items-center gap-3 text-[22px] font-normal tracking-[-0.01em]"
          aria-label="EV Mobility Dashboard home"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Fuel className="size-4" strokeWidth={2} aria-hidden="true" />
          </span>
          <span>EV Mobility Dashboard</span>
        </a>

        <nav aria-label="Primary" className="flex items-center gap-14">
          {navItems.map((item, index) => (
            <a
              key={item}
              href="#"
              className={[
                "flex h-9 items-center justify-center rounded-[10px] px-4 text-[15px] leading-none transition-colors",
                index === 0
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              {item}
            </a>
          ))}
        </nav>

        <div aria-hidden="true" />
      </header>

      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-8">
        <OperatorSearch />
      </main>
    </div>
  )
}
