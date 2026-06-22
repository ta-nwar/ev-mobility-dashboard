import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { formatInteger, formatMegawatts } from "@/lib/operatorFormat"
import { safeDivide } from "@/lib/operatorMetrics"
import type { ConnectorMap } from "@/lib/operatorTypes"
import type {
  GermanyStatePaths,
  RegionIndex,
  RegionRecord,
  RegionRolloutPoint,
  RegionStatesIndex,
  RegionTopOperator,
} from "@/lib/regionTypes"
import { cn } from "@/lib/utils"

import {
  Chip,
  DetailCell,
  FieldLabel,
  HeroMetric,
  LegendDot,
  MetricDivider,
  SectionLabel,
  SmallMetric,
  SplitBar,
} from "../operators/OperatorPrimitives"

type MetricKey = "capacity" | "points" | "fast" | "growth"

const metricOptions: Array<{ key: MetricKey; label: string }> = [
  { key: "capacity", label: "Capacity" },
  { key: "points", label: "Charging points" },
  { key: "fast", label: "DC-fast" },
  { key: "growth", label: "Growth" },
]

const paymentChips = [
  ["appPct", "App"],
  ["rfidPct", "RFID"],
  ["creditCardPct", "Credit card"],
  ["debitCardPct", "Debit card"],
  ["plugChargePct", "Plug & Charge"],
  ["freePct", "Free"],
] as const

const regionConnectorLabels: Array<[keyof ConnectorMap, string]> = [
  ["ccs", "CCS"],
  ["type2", "Type 2"],
  ["chademo", "CHAdeMO"],
  ["tesla", "Tesla"],
  ["schuko", "Schuko"],
  ["cee", "CEE"],
  ["mcs", "MCS"],
]

const stateLabelAdjust: Record<string, [number, number]> = {
  brandenburg: [-18, 150],
  niedersachsen: [0, 80],
}

function selectedStateFromUrl() {
  if (typeof window === "undefined") {
    return null
  }

  return new URLSearchParams(window.location.search).get("state")
}

function writeRegionsUrl(stateSlug: string | null, mode: "push" | "replace") {
  if (typeof window === "undefined") {
    return
  }

  const nextUrl = new URL(window.location.href)
  if (stateSlug) {
    nextUrl.searchParams.set("state", stateSlug)
  } else {
    nextUrl.searchParams.delete("state")
  }
  nextUrl.hash = "regions"

  const method = mode === "push" ? "pushState" : "replaceState"
  window.history[method](null, "", nextUrl)
}

export function RegionsRoute() {
  const [national, setNational] = useState<RegionRecord | null>(null)
  const [states, setStates] = useState<RegionRecord[]>([])
  const [paths, setPaths] = useState<GermanyStatePaths | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [metric, setMetric] = useState<MetricKey>("capacity")
  const [hoverSlug, setHoverSlug] = useState<string | null>(null)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(selectedStateFromUrl)

  const isLoading = !national || states.length === 0 || !paths
  const overviewProgress = useCountUp(national ? "overview" : null)
  const detailProgress = useCountUp(selectedSlug)

  useEffect(() => {
    let ignore = false

    async function loadRegions() {
      try {
        const [indexData, statesData, pathsData] = await Promise.all([
          fetchJson<RegionIndex>("data/regions/index.json"),
          fetchJson<RegionStatesIndex>("data/regions/states.json"),
          fetchJson<GermanyStatePaths>("data/regions/germany-states-paths.json"),
        ])

        if (!ignore) {
          setNational(indexData.national)
          setStates(statesData.states)
          setPaths(pathsData)
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Regional data could not be loaded.",
          )
        }
      }
    }

    void loadRegions()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const syncFromUrl = () => {
      setSelectedSlug(selectedStateFromUrl())
    }

    window.addEventListener("popstate", syncFromUrl)
    window.addEventListener("hashchange", syncFromUrl)

    return () => {
      window.removeEventListener("popstate", syncFromUrl)
      window.removeEventListener("hashchange", syncFromUrl)
    }
  }, [])

  useEffect(() => {
    requestAnimationFrame(() => {
      document.querySelector("main section")?.scrollTo({ top: 0, left: 0 })
    })
  }, [selectedSlug])

  const selectedState = useMemo(() => {
    if (!selectedSlug) {
      return null
    }

    return states.find((state) => state.slug === selectedSlug) ?? null
  }, [selectedSlug, states])

  const selectState = (slug: string) => {
    setSelectedSlug(slug)
    writeRegionsUrl(slug, "push")
  }

  const showOverview = () => {
    setSelectedSlug(null)
    writeRegionsUrl(null, "push")
  }

  if (loadError) {
    return (
      <section className="flex min-h-0 min-w-0 flex-1 items-center justify-center px-6 text-center">
        <div>
          <SectionLabel>Regions unavailable</SectionLabel>
          <p className="mt-2 max-w-[420px] text-sm text-muted-foreground">
            {loadError}
          </p>
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading regional data
      </section>
    )
  }

  if (selectedState) {
    return (
      <section className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <StateDetail
          state={selectedState}
          states={states}
          national={national}
          paths={paths}
          progress={detailProgress}
          onBack={showOverview}
          onSelectState={selectState}
        />
      </section>
    )
  }

  return (
    <section className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-12 sm:px-10">
        <NationalStrip
          national={national}
          progress={overviewProgress}
          stateCount={states.length}
        />

        <div className="mt-12">
          <MetricToggle metric={metric} onChange={setMetric} />
        </div>

        <div className="mt-7 grid min-w-0 gap-10 lg:grid-cols-[minmax(360px,0.9fr)_minmax(420px,1fr)] lg:items-start">
          <GermanyChoropleth
            paths={paths}
            states={states}
            metric={metric}
            hoverSlug={hoverSlug}
            onHover={setHoverSlug}
            onSelect={selectState}
          />
          <RankedRegions
            states={states}
            metric={metric}
            hoverSlug={hoverSlug}
            onHover={setHoverSlug}
            onSelect={selectState}
          />
        </div>
        <AttributionNote />
      </div>
    </section>
  )
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`Missing regional data: ${path}`)
  }

  return (await response.json()) as T
}

function NationalStrip({
  national,
  progress,
  stateCount,
}: {
  national: RegionRecord
  progress: number
  stateCount: number
}) {
  return (
    <div>
      <SectionLabel>Nationwide</SectionLabel>
      <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-[-0.02em]">
        Germany's charging network
      </h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        {formatInteger(national.chargingUnits)} charging units across{" "}
        {formatInteger(stateCount)} states - {formatInteger(national.districtCount)}{" "}
        districts - pick a region to drill in
      </p>

      <div className="mt-8 flex flex-wrap items-start gap-8">
        <HeroMetric
          label="charging points"
          value={formatInteger(Math.round(national.chargingPoints * progress))}
        />
        <MetricDivider />
        <HeroMetric
          label="capacity"
          value={formatMegawatts(national.reportedNominalKw * progress)}
          unit="MW"
        />
        <MetricDivider />
        <HeroMetric
          label="DC fast"
          value={formatInteger(Math.round(national.dcFastPct * progress))}
          unit="%"
          compactUnit
        />
        <MetricDivider />
        <HeroMetric
          label="operators"
          value={formatInteger(Math.round(national.operatorCount * progress))}
        />
      </div>
    </div>
  )
}

function MetricToggle({
  metric,
  onChange,
}: {
  metric: MetricKey
  onChange: (metric: MetricKey) => void
}) {
  return (
    <div
      className="inline-flex max-w-full flex-wrap rounded-[10px] bg-muted p-1"
      role="group"
      aria-label="Regional ranking metric"
    >
      {metricOptions.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-pressed={metric === option.key}
          className={cn(
            "h-[34px] rounded-[8px] px-4 text-sm transition-colors max-sm:px-3",
            metric === option.key
              ? "bg-primary font-semibold text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function GermanyChoropleth({
  paths,
  states,
  metric,
  hoverSlug,
  onHover,
  onSelect,
}: {
  paths: GermanyStatePaths
  states: RegionRecord[]
  metric: MetricKey
  hoverSlug: string | null
  onHover: (slug: string | null) => void
  onSelect: (slug: string) => void
}) {
  const pathBySlug = useMemo(
    () => new Map(paths.states.map((path) => [path.slug, path])),
    [paths.states],
  )
  const values = states.map((state) => metricValue(state, metric))
  const min = Math.min(...values)
  const max = Math.max(...values)
  const stateBySlug = new Map(states.map((state) => [state.slug, state]))
  const activePath = hoverSlug ? pathBySlug.get(hoverSlug) : null
  const hoveredState = hoverSlug ? stateBySlug.get(hoverSlug) : null

  return (
    <div>
      <div className="relative mx-auto max-w-[520px]">
        <svg
          viewBox={`0 0 ${paths.viewBox.w} ${paths.viewBox.h}`}
          className="block h-auto w-full"
          role="group"
          aria-label="Germany states shaded by selected regional metric"
        >
          {paths.states.map((path) => {
            const state = stateBySlug.get(path.slug)
            const value = state ? metricValue(state, metric) : 0
            const normalized = normalize(value, min, max)

            return (
              <path
                key={path.slug}
                d={path.d}
                fill={mapFill(normalized)}
                stroke="var(--background)"
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer outline-none transition-opacity hover:opacity-90 focus-visible:opacity-90"
                role="button"
                tabIndex={0}
                aria-label={
                  state
                    ? `Open ${state.name} region detail, ${metricDisplay(state, metric)}`
                    : `Open ${path.name} region detail`
                }
                onMouseEnter={() => onHover(path.slug)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(path.slug)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(path.slug)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onSelect(path.slug)
                  }
                }}
              />
            )
          })}
          {activePath ? (
            <path
              d={activePath.d}
              fill="none"
              stroke="var(--foreground)"
              strokeWidth={1.8}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          ) : null}
        </svg>

        <div className="pointer-events-none absolute inset-0">
          {paths.states.map((path) => {
            const state = stateBySlug.get(path.slug)
            const value = state ? metricValue(state, metric) : 0
            const normalized = normalize(value, min, max)
            const [dx, dy] = stateLabelAdjust[path.slug] ?? [0, 0]
            const left = ((path.cx + dx) / paths.viewBox.w) * 100
            const top = ((path.cy + dy) / paths.viewBox.h) * 100

            return (
              <span
                key={path.slug}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 text-[11px] font-semibold",
                  normalized > 0.55 ? "text-background" : "text-foreground",
                )}
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                {path.abbr}
              </span>
            )
          })}
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-[520px]">
        <div className="h-2 rounded-full bg-[linear-gradient(90deg,var(--dashboard-map-low),var(--dashboard-map-high))]" />
        <div className="mt-2 flex justify-between text-xs text-[var(--dashboard-text-soft)]">
          <span>{formatMetricValue(min, metric)}</span>
          <span>{formatMetricValue(max, metric)}</span>
        </div>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          {hoveredState
            ? `${hoveredState.name} - ${metricDisplay(hoveredState, metric)}`
            : `Map shading and ranking by ${metricLabel(metric).toLowerCase()}`}
        </p>
      </div>
    </div>
  )
}

function RankedRegions({
  states,
  metric,
  hoverSlug,
  onHover,
  onSelect,
}: {
  states: RegionRecord[]
  metric: MetricKey
  hoverSlug: string | null
  onHover: (slug: string | null) => void
  onSelect: (slug: string) => void
}) {
  const ranked = [...states].sort((a, b) => {
    const valueDelta = metricValue(b, metric) - metricValue(a, metric)
    return valueDelta || a.name.localeCompare(b.name)
  })
  const max = Math.max(...ranked.map((state) => metricValue(state, metric)), 1)

  return (
    <div className="min-w-0">
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Ranked by {metricLabel(metric)}</SectionLabel>
        <span className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--dashboard-text-soft)]">
          {metricUnit(metric)}
        </span>
      </div>
      <div>
        {ranked.map((state, index) => {
          const value = metricValue(state, metric)
          const isHovered = hoverSlug === state.slug

          return (
            <button
              key={state.slug}
              type="button"
              onClick={() => onSelect(state.slug)}
              onMouseEnter={() => onHover(state.slug)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(state.slug)}
              onBlur={() => onHover(null)}
              className={cn(
                "flex h-[52px] w-full items-center gap-4 border-b border-[var(--dashboard-rule)] px-3 text-left transition-colors",
                isHovered
                  ? "bg-[var(--dashboard-row-active)]"
                  : "hover:bg-[var(--dashboard-row-hover)]",
              )}
            >
              <span className="w-[22px] flex-none text-[13px] text-[var(--dashboard-text-subtle)]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                {state.name}
              </span>
              <span className="h-1.5 w-[90px] flex-none overflow-hidden rounded-full bg-[var(--dashboard-track-soft)] max-sm:hidden">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(3, (value / max) * 100)}%` }}
                />
              </span>
              <span className="w-[96px] flex-none text-right text-sm text-foreground">
                {formatMetricValue(value, metric)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StateDetail({
  state,
  states,
  national,
  paths,
  progress,
  onBack,
  onSelectState,
}: {
  state: RegionRecord
  states: RegionRecord[]
  national: RegionRecord
  paths: GermanyStatePaths
  progress: number
  onBack: () => void
  onSelectState: (slug: string) => void
}) {
  const capacityShare = Math.round(
    safeDivide(state.reportedNominalKw, national.reportedNominalKw) * 100,
  )
  const ranked = [...states].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
  const index = ranked.findIndex((item) => item.slug === state.slug)
  const previous = ranked[(index - 1 + ranked.length) % ranked.length]
  const next = ranked[(index + 1) % ranked.length]

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8 sm:px-10">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 items-center gap-2 rounded-[10px] border border-[var(--dashboard-rule-strong)] px-3.5 text-sm text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="size-4 text-muted-foreground" />
          All regions
        </button>
        <div className="flex items-center gap-5 text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => onSelectState(previous.slug)}
            className="flex size-9 items-center justify-center rounded-[10px] border border-[var(--dashboard-rule-strong)] transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Previous region, ${previous.name}`}
          >
            <ChevronLeft className="size-4" />
          </button>
          <span>
            Region {state.rank ?? index + 1} of {states.length}
          </span>
          <span className="sr-only">Regions are ordered by capacity rank.</span>
          <button
            type="button"
            onClick={() => onSelectState(next.slug)}
            className="flex size-9 items-center justify-center rounded-[10px] border border-[var(--dashboard-rule-strong)] transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Next region, ${next.name}`}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <LocatorMap paths={paths} selectedSlug={state.slug} />
        <div className="min-w-0">
          <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.02em]">
            {state.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rank #{state.rank ?? "-"} of {states.length} / {capacityShare}% of
            national capacity
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-start gap-8">
        <HeroMetric
          label="charging units"
          value={formatInteger(Math.round(state.chargingUnits * progress))}
        />
        <MetricDivider />
        <HeroMetric
          label="charging points"
          value={formatInteger(Math.round(state.chargingPoints * progress))}
        />
        <MetricDivider />
        <HeroMetric
          label="capacity"
          value={formatMegawatts(state.reportedNominalKw * progress)}
          unit="MW"
        />
        <MetricDivider />
        <HeroMetric
          label="DC fast"
          value={formatInteger(Math.round(state.dcFastPct * progress))}
          unit="%"
          compactUnit
        />
        <MetricDivider />
        <HeroMetric
          label="operators"
          value={formatInteger(Math.round(state.operatorCount * progress))}
        />
      </div>

      <div className="mt-8 w-full max-w-[650px]">
        <div className="relative">
          <SplitBar value={state.dcFastPct} />
          <span
            className="absolute -bottom-[5px] -top-[5px] w-px bg-[var(--dashboard-text-subtle)]"
            style={{ left: `${national.dcFastPct}%` }}
          />
        </div>
        <div className="mt-2.5 grid gap-x-3 gap-y-1 text-xs text-[var(--dashboard-text-soft)] sm:grid-cols-3">
          <LegendDot label={`${state.dcFastPct}% DC fast`} tone="dark" />
          <span className="text-[var(--dashboard-text-subtle)] sm:text-center">
            national {national.dcFastPct}%
          </span>
          <span className="sm:justify-self-end">
            <LegendDot label={`${state.normalPct}% AC normal`} tone="light" />
          </span>
        </div>
      </div>

      <div className="mt-9 grid min-w-0 gap-px bg-border lg:grid-cols-2">
        <PowerProfile state={state} />
        <MarketStructure state={state} />
        <AccessOperations state={state} />
        <ConnectorCoverage state={state} />
        <RolloutSection state={state} />
        <GeoBreakdown state={state} />
      </div>
      <AttributionNote />
    </div>
  )
}

function PowerProfile({ state }: { state: RegionRecord }) {
  return (
    <DetailCell>
      <SectionLabel>Power profile</SectionLabel>
      <div className="flex flex-wrap gap-10">
        <SmallMetric
          label="avg / point"
          value={formatInteger(state.avgKwPerPoint)}
          unit="kW"
          large
        />
        <SmallMetric label="peak" value={formatInteger(state.peakKw)} unit="kW" large />
        <SmallMetric
          label="slots / unit"
          value={state.plugSlotsPerUnit.toFixed(1)}
          large
        />
      </div>
      <div>
        <FieldLabel>power classes</FieldLabel>
        <StackedBar
          segments={[
            { value: state.powerClass150PlusPct, tone: "dark" },
            { value: state.powerClass50To149Pct, tone: "mid" },
            { value: state.powerClassLowPct, tone: "light" },
          ]}
        />
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--dashboard-text-soft)]">
          <LegendDot
            label={`150kW+ \u00b7 ${state.powerClass150PlusPct}%`}
            tone="dark"
          />
          <LegendDot
            label={`50-149 \u00b7 ${state.powerClass50To149Pct}%`}
            tone="mid"
          />
          <LegendDot
            label={`<=49kW \u00b7 ${state.powerClassLowPct}%`}
            tone="light"
          />
        </div>
      </div>
    </DetailCell>
  )
}

function MarketStructure({ state }: { state: RegionRecord }) {
  return (
    <DetailCell>
      <SectionLabel>Market structure</SectionLabel>
      <div className="flex flex-wrap gap-10">
        <SmallMetric label="operators" value={formatInteger(state.operatorCount)} large />
        <SmallMetric
          label="top operator"
          value={formatInteger(state.topOperatorReportedNominalKwPct)}
          unit="%"
          large
        />
        <SmallMetric
          label="top 5"
          value={formatInteger(state.top5ReportedNominalKwPct)}
          unit="%"
          large
        />
      </div>
      <ConcentrationRows operators={state.topOperators} />
    </DetailCell>
  )
}

function AccessOperations({ state }: { state: RegionRecord }) {
  return (
    <DetailCell>
      <SectionLabel>Access & operations</SectionLabel>
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        <SmallMetric
          label="open 24/7"
          value={formatInteger(state.open247Pct)}
          unit="%"
          large
        />
        <div className="min-w-[240px] flex-1">
          <FieldLabel>parking</FieldLabel>
          <StackedBar
            segments={[
              { value: state.parking.unrestrictedPct, tone: "dark" },
              { value: state.parking.limitedPct, tone: "mid" },
              { value: state.parking.unknownPct, tone: "light" },
            ]}
          />
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--dashboard-text-soft)]">
            <LegendDot
              label={`unrestricted ${state.parking.unrestrictedPct}%`}
              tone="dark"
            />
            <LegendDot label={`customer ${state.parking.limitedPct}%`} tone="mid" />
            <LegendDot label={`unknown ${state.parking.unknownPct}%`} tone="light" />
          </div>
        </div>
      </div>
      <div>
        <FieldLabel>payment accepted</FieldLabel>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {paymentChips.map(([key, label]) => {
            const value = state.payment[key]
            return (
              <Chip key={key} active={value >= 8}>
                {label} {"\u00b7"} {value}%
              </Chip>
            )
          })}
        </div>
      </div>
    </DetailCell>
  )
}

function ConnectorCoverage({ state }: { state: RegionRecord }) {
  return (
    <DetailCell>
      <SectionLabel>Connector coverage</SectionLabel>
      <div>
        <FieldLabel>standards present in the region</FieldLabel>
        <div className="mt-4 flex flex-wrap gap-2">
          {regionConnectorLabels.map(([key, label]) => {
            const pct = state.connectorUnitPct[key] ?? 0
            const active = Boolean(state.connectors[key])

            return (
              <Chip key={key} active={active}>
                {pct > 0 ? `${label} \u00b7 ${pct}%` : label}
              </Chip>
            )
          })}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Share is the percentage of charging units in the region listing each
        connector. Categories overlap.
      </p>
    </DetailCell>
  )
}

function RolloutSection({ state }: { state: RegionRecord }) {
  const firstYear = firstRolloutYear(state.rolloutByYear)
  const newestYear = Number(state.newestDate.slice(0, 4))

  return (
    <div className="col-span-1 flex min-w-0 flex-col gap-[18px] bg-background px-6 py-7 sm:px-8 lg:col-span-2">
      <SectionLabel>Rollout - cumulative charging units</SectionLabel>
      <div className="flex flex-col gap-9 xl:flex-row xl:items-end xl:gap-14">
        <div className="min-w-0 flex-1">
          <RegionRolloutSparkline points={state.rolloutByYear} />
          <div className="mt-1.5 flex justify-between text-[11px] text-[var(--dashboard-text-subtle)]">
            <span>{firstYear}</span>
            <span>{newestYear}</span>
          </div>
        </div>
        <div className="flex flex-none flex-wrap gap-10">
          <SmallMetric label="first live" value={String(firstYear)} />
          <SmallMetric label="newest" value={String(newestYear)} />
          <SmallMetric
            label={`added \u00b7 12 mo`}
            value={`+${formatInteger(state.addedLast12Mo.chargingUnits)}`}
          />
        </div>
      </div>
    </div>
  )
}

function GeoBreakdown({ state }: { state: RegionRecord }) {
  return (
    <div className="col-span-1 min-w-0 bg-background px-6 py-7 sm:px-8 lg:col-span-2">
      <SectionLabel>Where the chargers are</SectionLabel>
      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <BreakdownList title="top districts" items={state.topDistricts ?? []} />
        <BreakdownList title="top cities" items={state.topCities ?? []} />
      </div>
    </div>
  )
}

function AttributionNote() {
  return (
    <p className="mt-6 text-xs text-[var(--dashboard-text-subtle)]">
      Boundaries: GeoBasis-DE / BKG (2025), dl-de/by-2-0.
    </p>
  )
}

function BreakdownList({
  title,
  items,
}: {
  title: string
  items: NonNullable<RegionRecord["topDistricts"]>
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex justify-between text-[13px] text-muted-foreground">
        <span>{title}</span>
        <span>units {"\u00b7"} DC fast</span>
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          className="flex h-[52px] items-center gap-4 border-t border-[var(--dashboard-rule)]"
        >
          <span className="w-5 flex-none text-[13px] text-[var(--dashboard-text-subtle)]">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
            {item.name}
          </span>
          <span className="w-[58px] flex-none text-right text-sm">
            {formatInteger(item.chargingUnits)}
          </span>
          <span className="w-[48px] flex-none text-right text-sm text-muted-foreground">
            {item.dcFastPct}%
          </span>
        </div>
      ))}
    </div>
  )
}

function ConcentrationRows({ operators }: { operators: RegionTopOperator[] }) {
  const max = Math.max(...operators.map((operator) => operator.reportedNominalKwPct), 1)

  return (
    <div className="flex flex-col gap-3">
      {operators.map((operator) => (
        <div
          key={operator.operator}
          className="grid grid-cols-[minmax(0,1fr)_120px_42px] items-center gap-4 text-sm"
        >
          <span className="min-w-0 truncate">{operator.operator}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-[var(--dashboard-track-soft)]">
            <span
              className="block h-full rounded-full bg-primary"
              style={{
                width: `${Math.max(4, (operator.reportedNominalKwPct / max) * 100)}%`,
              }}
            />
          </span>
          <span className="text-right text-[13px] text-muted-foreground">
            {operator.reportedNominalKwPct}%
          </span>
        </div>
      ))}
    </div>
  )
}

function LocatorMap({
  paths,
  selectedSlug,
}: {
  paths: GermanyStatePaths
  selectedSlug: string
}) {
  return (
    <svg
      viewBox={`0 0 ${paths.viewBox.w} ${paths.viewBox.h}`}
      className="h-[72px] w-[54px] flex-none"
      aria-hidden="true"
    >
      {paths.states.map((path) => (
        <path
          key={path.slug}
          d={path.d}
          fill={path.slug === selectedSlug ? "var(--primary)" : "var(--dashboard-track-soft)"}
          stroke="var(--background)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}

function StackedBar({
  segments,
}: {
  segments: Array<{ value: number; tone: "dark" | "mid" | "light" }>
}) {
  return (
    <div className="mt-2.5 flex h-2 gap-[3px]">
      {segments.map((segment) => (
        <div
          key={segment.tone}
          className={cn(
            "rounded-full",
            segment.tone === "dark"
              ? "bg-primary"
              : segment.tone === "mid"
                ? "bg-[var(--dashboard-track-mid)]"
                : "bg-[var(--dashboard-track)]",
          )}
          style={{ flexGrow: Math.max(0.01, segment.value), flexBasis: 0 }}
        />
      ))}
    </div>
  )
}

function RegionRolloutSparkline({ points }: { points: RegionRolloutPoint[] }) {
  const path = rolloutPath(points)
  const area = rolloutAreaPath(points)

  return (
    <svg
      width="100%"
      height="120"
      viewBox="0 0 600 120"
      preserveAspectRatio="none"
      className="block"
      aria-hidden="true"
    >
      <path d={area} fill="currentColor" className="text-primary opacity-[0.06]" />
      <polyline
        points={path}
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

function useCountUp(trigger: string | null) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!trigger) {
      return
    }

    let frame = 0
    const duration = 750
    const startedAt = performance.now()
    const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3)

    const tick = (now: number) => {
      const nextProgress = Math.min(1, (now - startedAt) / duration)
      setProgress(easeOutCubic(nextProgress))

      if (nextProgress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [trigger])

  return progress
}

function metricValue(state: RegionRecord, metric: MetricKey) {
  if (metric === "points") {
    return state.chargingPoints
  }
  if (metric === "fast") {
    return state.dcFastPct
  }
  if (metric === "growth") {
    return state.addedLast12Mo.chargingUnits
  }
  return state.reportedNominalKw
}

function metricLabel(metric: MetricKey) {
  return metricOptions.find((option) => option.key === metric)?.label ?? "Capacity"
}

function metricUnit(metric: MetricKey) {
  if (metric === "capacity") {
    return "MW"
  }
  if (metric === "fast") {
    return "%"
  }
  if (metric === "growth") {
    return "12 mo"
  }
  return "units"
}

function formatMetricValue(value: number, metric: MetricKey) {
  if (metric === "capacity") {
    return `${formatMegawatts(value)} MW`
  }
  if (metric === "fast") {
    return `${formatInteger(value)}%`
  }
  if (metric === "growth") {
    return `+${formatInteger(value)}`
  }
  return formatInteger(value)
}

function metricDisplay(state: RegionRecord, metric: MetricKey) {
  return formatMetricValue(metricValue(state, metric), metric)
}

function normalize(value: number, min: number, max: number) {
  if (max === min) {
    return 1
  }

  return Math.pow((value - min) / (max - min), 0.8)
}

function mapFill(normalized: number) {
  const high = Math.round(normalized * 100)
  return `color-mix(in oklch, var(--dashboard-map-low) ${100 - high}%, var(--dashboard-map-high) ${high}%)`
}

function rolloutPoints(points: RegionRolloutPoint[]) {
  if (points.length === 0) {
    return [
      [0, 112],
      [600, 112],
    ] as Array<[number, number]>
  }

  const firstYear = Math.min(...points.map((point) => point.year))
  const lastYear = Math.max(2026, ...points.map((point) => point.year))
  const max = Math.max(...points.map((point) => point.cumulativeUnits), 1)
  const denominator = Math.max(lastYear - firstYear, 1)

  return points.map((point) => {
    const x = ((point.year - firstYear) / denominator) * 600
    const y = 112 - (point.cumulativeUnits / max) * 92
    return [round1(x), round1(y)] as [number, number]
  })
}

function rolloutPath(points: RegionRolloutPoint[]) {
  return rolloutPoints(points)
    .map(([x, y]) => `${x},${y}`)
    .join(" ")
}

function rolloutAreaPath(points: RegionRolloutPoint[]) {
  const plotted = rolloutPoints(points)
  const line = plotted.map(([x, y]) => `L${x},${y}`).join(" ")
  const lastX = plotted[plotted.length - 1]?.[0] ?? 600
  const firstX = plotted[0]?.[0] ?? 0

  return `M${firstX},112 ${line} L${lastX},112 Z`
}

function firstRolloutYear(points: RegionRolloutPoint[]) {
  return points[0]?.year ?? 2014
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}
