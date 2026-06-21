import type { ReactNode } from "react"

import { normalizeSparkline, type OperatorProfile } from "@/lib/operatorMetrics"
import type { RolloutPoint } from "@/lib/operatorTypes"
import { cn } from "@/lib/utils"

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--dashboard-text-soft)]">
      {children}
    </span>
  )
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[13px] text-muted-foreground">{children}</span>
}

export function DetailCell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[18px] bg-background px-6 py-7 sm:px-8">
      {children}
    </div>
  )
}

export function HeroMetric({
  label,
  value,
  unit,
  compactUnit = false,
}: {
  label: string
  value: string
  unit?: string
  compactUnit?: boolean
}) {
  return (
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <span className="mt-[7px] text-[30px] font-semibold leading-none tracking-[-0.02em]">
        {value}
        {unit ? (
          <span
            className={cn(
              "font-medium text-muted-foreground",
              compactUnit ? "ml-0.5 text-[17px]" : "ml-1.5 text-[17px]",
            )}
          >
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  )
}

export function SmallMetric({
  label,
  value,
  unit,
  large = false,
}: {
  label: string
  value: string
  unit?: string
  large?: boolean
}) {
  return (
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <span
        className={cn(
          "mt-1.5 font-semibold leading-none tracking-[-0.02em]",
          large ? "text-[30px]" : "text-2xl",
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1.5 text-base font-medium text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  )
}

export function MetricDivider() {
  return (
    <div className="hidden h-[52px] w-px bg-[var(--dashboard-rule-strong)] sm:block" />
  )
}

export function SplitBar({
  value,
  small = false,
}: {
  value: number
  small?: boolean
}) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div className={cn("flex gap-[3px]", small ? "h-[7px]" : "h-2")}>
      <div
        className="rounded-full bg-primary"
        style={{ flexGrow: clampedValue, flexBasis: 0 }}
      />
      <div
        className="rounded-full bg-[var(--dashboard-track)]"
        style={{ flexGrow: 100 - clampedValue, flexBasis: 0 }}
      />
    </div>
  )
}

export function SplitLegend({ left, right }: { left: string; right: string }) {
  return (
    <div className="mt-2.5 flex justify-between text-xs text-[var(--dashboard-text-soft)]">
      <LegendDot label={left} tone="dark" />
      <LegendDot label={right} tone="light" />
    </div>
  )
}

export function PowerClassBar({ profile }: { profile: OperatorProfile }) {
  return (
    <div className="mt-2.5 flex h-2 gap-[3px]">
      <div
        className="rounded-full bg-primary"
        style={{ flexGrow: profile.powerClass150PlusPct, flexBasis: 0 }}
      />
      <div
        className="rounded-full bg-[var(--dashboard-track-mid)]"
        style={{ flexGrow: profile.powerClass50To149Pct, flexBasis: 0 }}
      />
      <div
        className="rounded-full bg-[var(--dashboard-track)]"
        style={{ flexGrow: profile.powerClassLowPct, flexBasis: 0 }}
      />
    </div>
  )
}

export function LegendDot({
  label,
  tone,
}: {
  label: string
  tone: "dark" | "mid" | "light"
}) {
  const toneClass =
    tone === "dark"
      ? "bg-primary"
      : tone === "mid"
        ? "bg-[var(--dashboard-track-mid)]"
        : "bg-[var(--dashboard-track)]"

  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", toneClass)} />
      {label}
    </span>
  )
}

export function Chip({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[13px]",
        active
          ? "border-primary text-foreground"
          : "border-[var(--dashboard-rule-strong)] text-[var(--dashboard-chip-muted)]",
      )}
    >
      {children}
    </span>
  )
}

export function RolloutSparkline({ points }: { points: RolloutPoint[] }) {
  return (
    <svg
      width="100%"
      height="84"
      viewBox="0 0 600 84"
      preserveAspectRatio="none"
      className="block"
      aria-hidden="true"
    >
      <polyline
        points={normalizeSparkline(points)}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="text-primary"
      />
    </svg>
  )
}
