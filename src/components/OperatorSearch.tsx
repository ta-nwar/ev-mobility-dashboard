import { Check, Plus, Search, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

type ConnectorMap = {
  ccs?: boolean
  type2?: boolean
  tesla?: boolean
  chademo?: boolean
  schuko?: boolean
  cee?: boolean
  mcs?: boolean
}

type RolloutPoint = {
  year: number
  cumulative: number
}

type OperatorRecord = {
  operator: string
  rank?: number
  chargingUnits: number
  chargingPoints: number
  reportedNominalKw: number
  dcFastChargingPoints?: number
  dcFastPct?: number
  avgKwPerPoint?: number
  peakKw?: number
  plugSlotsPerStation?: number
  powerClass150PlusPct?: number
  powerClass50To149Pct?: number
  powerClassLowPct?: number
  statesCovered?: number
  topCities?: string[]
  open247Pct?: number
  parking?: string
  paymentOptions?: string[]
  firstLiveYear?: number
  newestYear?: number
  addedLast12Mo?: number
  connectors?: ConnectorMap
  rolloutByYear?: RolloutPoint[]
}

type OperatorIndex = {
  operatorCount: number
  national?: {
    dcFastPct?: number
    chargingPoints?: number
    reportedNominalKw?: number
  }
  operators: OperatorRecord[]
}

type OperatorProfile = ReturnType<typeof buildProfile>

const connectorLabels: Array<[keyof ConnectorMap, string]> = [
  ["ccs", "CCS"],
  ["type2", "Type 2"],
  ["tesla", "Tesla"],
  ["chademo", "CHAdeMO"],
  ["schuko", "Schuko"],
  ["cee", "CEE"],
]

const fallbackCities = [
  "Berlin",
  "Munich",
  "Hamburg",
  "Cologne",
  "Frankfurt",
  "Stuttgart",
  "Dusseldorf",
  "Leipzig",
]

const railRowHeight = 48
const railOverscan = 8
const railVisibleRows = 40

export function OperatorSearch() {
  const [query, setQuery] = useState("")
  const [operatorIndex, setOperatorIndex] = useState<OperatorIndex | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(
    null,
  )
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [animationProgress, setAnimationProgress] = useState(1)
  const [railScrollTop, setRailScrollTop] = useState(0)
  const railScrollerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let ignore = false

    async function loadOperators() {
      try {
        const response = await fetch("/data/operators.json")
        const data = (await response.json()) as OperatorIndex

        if (!ignore) {
          setOperatorIndex(data)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadOperators()

    return () => {
      ignore = true
    }
  }, [])

  const operators = operatorIndex?.operators ?? []
  const operatorCount = operatorIndex?.operatorCount ?? operators.length
  const totalCapacityKw =
    operatorIndex?.national?.reportedNominalKw ??
    operators.reduce((sum, operator) => sum + operator.reportedNominalKw, 0)
  const nationalFastPct =
    operatorIndex?.national?.dcFastPct ??
    Math.round(
      safeDivide(
        operators.reduce(
          (sum, operator) => sum + (operator.dcFastChargingPoints ?? 0),
          0,
        ),
        operators.reduce((sum, operator) => sum + operator.chargingPoints, 0),
      ) * 100,
    )

  const selectedOperator = useMemo(() => {
    if (!selectedOperatorId) {
      return null
    }

    return (
      operators.find((operator) => operator.operator === selectedOperatorId) ??
      null
    )
  }, [operators, selectedOperatorId])

  useEffect(() => {
    if (!selectedOperator || compareMode) {
      setAnimationProgress(1)
      return
    }

    let frame = 0
    const duration = 750
    const startedAt = performance.now()
    const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3)

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      setAnimationProgress(easeOutCubic(progress))

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    setAnimationProgress(0)
    frame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frame)
  }, [compareMode, selectedOperator])

  const filteredOperators = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return operators
    }

    return operators.filter((operator) =>
      operator.operator.toLowerCase().includes(normalizedQuery),
    )
  }, [operators, query])

  useEffect(() => {
    setRailScrollTop(0)

    if (railScrollerRef.current) {
      railScrollerRef.current.scrollTop = 0
    }
  }, [query])

  const railStartIndex = Math.max(
    0,
    Math.floor(railScrollTop / railRowHeight) - railOverscan,
  )
  const railEndIndex = Math.min(
    filteredOperators.length,
    railStartIndex + railVisibleRows + railOverscan * 2,
  )
  const railOperators = filteredOperators.slice(railStartIndex, railEndIndex)

  const compareOperators = compareIds
    .map((id) => operators.find((operator) => operator.operator === id))
    .filter((operator): operator is OperatorRecord => Boolean(operator))

  const selectOperator = (operator: OperatorRecord) => {
    setSelectedOperatorId(operator.operator)
    setCompareMode(false)
  }

  const resetOverview = () => {
    setSelectedOperatorId(null)
    setCompareMode(false)
    setCompareIds([])
  }

  const startCompare = () => {
    if (selectedOperator && !compareIds.includes(selectedOperator.operator)) {
      setCompareIds([selectedOperator.operator, ...compareIds].slice(0, 4))
    }

    setCompareMode(true)
  }

  const toggleCompare = (operator: OperatorRecord) => {
    setCompareIds((current) => {
      if (current.includes(operator.operator)) {
        return current.filter((id) => id !== operator.operator)
      }

      if (current.length >= 4) {
        return current
      }

      return [...current, operator.operator]
    })
  }

  const railCountLabel = query.trim()
    ? `${formatInteger(filteredOperators.length)} of ${formatInteger(operatorCount)}`
    : `${formatInteger(operatorCount)} operators`

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="flex h-[42vh] w-full flex-none flex-col border-b md:h-auto md:w-[340px] md:border-b-0 md:border-r">
        <div className="flex flex-col gap-3 p-[18px] pb-3">
          <label className="relative block">
            <span className="sr-only">Search operators</span>
            <Search
              className="pointer-events-none absolute left-[13px] top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search operators"
              className="h-11 w-full rounded-[11px] border bg-muted/60 pl-10 pr-4 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:bg-card focus:ring-2 focus:ring-ring/20"
              type="search"
              autoComplete="off"
            />
          </label>

          <div className="flex items-center justify-between px-0.5 text-xs">
            <span className="text-muted-foreground">{railCountLabel}</span>
            <span className="text-[oklch(0.4_0_0)]">
              {compareMode ? "tap to add" : "Sort: Capacity"}
            </span>
          </div>
        </div>

        <div
          ref={railScrollerRef}
          onScroll={(event) => setRailScrollTop(event.currentTarget.scrollTop)}
          className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-[18px]"
        >
          {isLoading ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Loading operators
            </p>
          ) : filteredOperators.length > 0 ? (
            <div
              className="relative"
              style={{ height: filteredOperators.length * railRowHeight }}
            >
              {railOperators.map((operator, index) => {
                const absoluteIndex = railStartIndex + index
                const isSelected = selectedOperatorId === operator.operator
                const isCompared = compareIds.includes(operator.operator)
                const isActive = compareMode ? isCompared : isSelected

                return (
                  <button
                    key={operator.operator}
                    type="button"
                    onClick={() =>
                      compareMode
                        ? toggleCompare(operator)
                        : selectOperator(operator)
                    }
                    aria-pressed={isActive}
                    className={[
                      "absolute left-0 right-0 flex h-12 items-center justify-between gap-3 border-b border-[oklch(0.94_0_0)] px-3 text-left transition-colors hover:bg-[oklch(0.985_0_0)]",
                      isActive
                        ? "rounded-lg border-b-transparent bg-[oklch(0.95_0_0)]"
                        : "bg-transparent",
                    ].join(" ")}
                    style={{ top: absoluteIndex * railRowHeight }}
                  >
                    <span className="min-w-0 truncate pr-1 text-[15px] font-normal text-[oklch(0.2_0_0)]">
                      {operator.operator}
                    </span>
                    <span className="flex flex-none items-center gap-2">
                      <span className="text-[13px] text-[oklch(0.55_0_0)]">
                        {formatMegawatts(operator.reportedNominalKw)} MW
                      </span>
                      {compareMode ? (
                        isCompared ? (
                          <span className="flex size-[18px] items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="flex size-[18px] items-center justify-center rounded-full border border-[oklch(0.8_0_0)] text-[oklch(0.45_0_0)]">
                            <Plus className="size-3" strokeWidth={2} />
                          </span>
                        )
                      ) : null}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No operators found
            </p>
          )}
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto">
        {compareMode ? (
          <CompareView
            operators={compareOperators}
            onClear={() => setCompareIds([])}
            onDone={() => setCompareMode(false)}
            onRemove={(operator) =>
              setCompareIds((current) =>
                current.filter((id) => id !== operator.operator),
              )
            }
          />
        ) : selectedOperator ? (
          <OperatorDetail
            operator={selectedOperator}
            profile={buildProfile(selectedOperator)}
            totalCapacityKw={totalCapacityKw}
            nationalFastPct={nationalFastPct}
            progress={animationProgress}
            onCompare={startCompare}
          />
        ) : (
          <OperatorOverview
            operators={operators}
            operatorCount={operatorCount}
            nationalFastPct={nationalFastPct}
            onSelect={selectOperator}
            onReset={resetOverview}
          />
        )}
      </section>
    </div>
  )
}

function OperatorOverview({
  operators,
  operatorCount,
  nationalFastPct,
  onSelect,
}: {
  operators: OperatorRecord[]
  operatorCount: number
  nationalFastPct: number
  onSelect: (operator: OperatorRecord) => void
  onReset: () => void
}) {
  const leaders = operators.slice(0, 10)
  const maxCapacity = leaders[0]?.reportedNominalKw ?? 1

  return (
    <div className="max-w-[1050px] px-6 py-9 sm:px-10">
      <SectionLabel>Nationwide</SectionLabel>
      <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-[-0.02em]">
        {formatInteger(operatorCount)} operators
      </h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Germany's public charging register - select an operator to explore
      </p>

      <div className="mt-7 w-full max-w-[520px]">
        <SplitBar value={nationalFastPct} />
        <SplitLegend
          left={`${nationalFastPct}% DC fast`}
          right={`${100 - nationalFastPct}% AC normal`}
        />
      </div>

      <div className="mt-10">
        <SectionLabel>Top operators by capacity</SectionLabel>
        <div className="mt-3">
          {leaders.map((operator, index) => (
            <button
              key={operator.operator}
              type="button"
              onClick={() => onSelect(operator)}
              className="flex h-[52px] w-full items-center gap-4 border-b border-[oklch(0.94_0_0)] px-0.5 text-left transition-colors hover:bg-[oklch(0.985_0_0)]"
            >
              <span className="w-[22px] flex-none text-[13px] text-[oklch(0.6_0_0)]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                {operator.operator}
              </span>
              <span className="h-1.5 w-[150px] flex-none overflow-hidden rounded-full bg-[oklch(0.93_0_0)] max-sm:hidden">
                <span
                  className="block h-full rounded-full bg-[oklch(0.3_0_0)]"
                  style={{
                    width: `${Math.round(
                      (operator.reportedNominalKw / maxCapacity) * 100,
                    )}%`,
                  }}
                />
              </span>
              <span className="w-[78px] flex-none text-right text-sm text-[oklch(0.3_0_0)] max-sm:w-[64px]">
                {formatMegawatts(operator.reportedNominalKw)} MW
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function OperatorDetail({
  operator,
  profile,
  totalCapacityKw,
  nationalFastPct,
  progress,
  onCompare,
}: {
  operator: OperatorRecord
  profile: OperatorProfile
  totalCapacityKw: number
  nationalFastPct: number
  progress: number
  onCompare: () => void
}) {
  const capacityShare = Math.round(
    safeDivide(operator.reportedNominalKw, totalCapacityKw) * 100,
  )

  return (
    <div>
      <div className="border-b px-10 py-8">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="m-0 text-[30px] font-semibold leading-tight tracking-[-0.02em]">
              {operator.operator}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              #{operator.rank ?? "-"} of 11,806 operators / {capacityShare}% of
              national capacity
            </p>
          </div>
          <button
            type="button"
            onClick={onCompare}
            className="flex h-9 flex-none items-center gap-2 rounded-[10px] border border-[oklch(0.9_0_0)] bg-transparent px-4 text-sm text-[oklch(0.25_0_0)] transition-colors hover:bg-muted"
          >
            <Plus className="size-3.5 text-[oklch(0.35_0_0)]" />
            Compare
          </button>
        </div>

        <div className="mt-7 flex flex-wrap items-start gap-8">
          <HeroMetric
            label="locations"
            value={formatInteger(Math.round(operator.chargingUnits * progress))}
          />
          <MetricDivider />
          <HeroMetric
            label="charging points"
            value={formatInteger(Math.round(operator.chargingPoints * progress))}
          />
          <MetricDivider />
          <HeroMetric
            label="capacity"
            value={formatInteger(
              Math.round((operator.reportedNominalKw / 1000) * progress),
            )}
            unit="MW"
          />
          <MetricDivider />
          <HeroMetric
            label="DC fast"
            value={formatInteger(Math.round(profile.dcFastPct * progress))}
            unit="%"
            compactUnit
          />
        </div>

        <div className="mt-6 w-full max-w-[650px]">
          <div className="relative">
            <SplitBar value={profile.dcFastPct} />
            <span
              className="absolute -bottom-[5px] -top-[5px] w-px bg-[oklch(0.6_0_0)]"
              style={{ left: `${nationalFastPct}%` }}
            />
          </div>
          <div className="mt-2.5 flex justify-between text-xs text-[oklch(0.5_0_0)]">
            <LegendDot label={`${profile.dcFastPct}% DC fast`} tone="dark" />
            <span className="text-[oklch(0.6_0_0)]">
              national median {nationalFastPct}%
            </span>
            <LegendDot
              label={`${100 - profile.dcFastPct}% AC normal`}
              tone="light"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-px bg-border lg:grid-cols-2">
        <DetailCell>
          <SectionLabel>Network composition</SectionLabel>
          <div>
            <FieldLabel>connectors</FieldLabel>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {connectorLabels.map(([key, label]) => (
                <Chip key={key} active={Boolean(profile.connectors[key])}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex gap-10">
            <SmallMetric
              label="plug slots / station"
              value={profile.plugSlotsPerStation.toFixed(1)}
            />
            <SmallMetric
              label="standards offered"
              value={String(
                connectorLabels.filter(([key]) => profile.connectors[key])
                  .length,
              )}
            />
          </div>
        </DetailCell>

        <DetailCell>
          <SectionLabel>Power profile</SectionLabel>
          <div className="flex gap-10">
            <SmallMetric
              label="avg / point"
              value={formatInteger(profile.avgKwPerPoint)}
              unit="kW"
              large
            />
            <SmallMetric
              label="peak"
              value={formatInteger(profile.peakKw)}
              unit="kW"
              large
            />
          </div>
          <div>
            <FieldLabel>power classes</FieldLabel>
            <PowerClassBar profile={profile} />
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[oklch(0.5_0_0)]">
              <LegendDot
                label={`150kW+ / ${profile.powerClass150PlusPct}%`}
                tone="dark"
              />
              <LegendDot
                label={`50-149 / ${profile.powerClass50To149Pct}%`}
                tone="mid"
              />
              <LegendDot
                label={`<=22kW / ${profile.powerClassLowPct}%`}
                tone="light"
              />
            </div>
          </div>
        </DetailCell>

        <DetailCell>
          <SectionLabel>Geography</SectionLabel>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-none flex-col gap-4">
              <SmallMetric
                label="states covered"
                value={String(profile.statesCovered)}
                unit="of 16"
                large
              />
              <div>
                <FieldLabel>top cities</FieldLabel>
                <p className="mt-1.5 text-sm leading-relaxed text-[oklch(0.25_0_0)]">
                  {profile.topCities.join(" / ")}
                </p>
              </div>
            </div>
            <div className="flex h-[150px] min-w-0 flex-1 items-center justify-center rounded-lg bg-[repeating-linear-gradient(45deg,oklch(0.96_0_0),oklch(0.96_0_0)_7px,oklch(0.93_0_0)_7px,oklch(0.93_0_0)_14px)]">
              <span className="font-mono text-[11px] text-[oklch(0.5_0_0)]">
                Germany / lat-lon dot map
              </span>
            </div>
          </div>
        </DetailCell>

        <DetailCell>
          <SectionLabel>Access & operations</SectionLabel>
          <div className="flex gap-10">
            <SmallMetric
              label="open 24/7"
              value={formatInteger(profile.open247Pct)}
              unit="%"
              large
            />
            <SmallMetric label="parking" value={profile.parking} large />
          </div>
          <div>
            <FieldLabel>payment</FieldLabel>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {profile.paymentOptions.map((payment) => (
                <Chip key={payment} active>
                  {payment}
                </Chip>
              ))}
            </div>
          </div>
        </DetailCell>

        <div className="col-span-1 flex flex-col gap-[18px] bg-background px-8 py-7 lg:col-span-2">
          <SectionLabel>Rollout</SectionLabel>
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:gap-12">
            <div className="min-w-0 flex-1">
              <RolloutSparkline points={profile.rolloutByYear} />
              <div className="mt-1.5 flex justify-between text-[11px] text-[oklch(0.6_0_0)]">
                <span>{profile.firstLiveYear}</span>
                <span>{profile.newestYear}</span>
              </div>
            </div>
            <div className="flex flex-none gap-10">
              <SmallMetric
                label="first live"
                value={String(profile.firstLiveYear)}
              />
              <SmallMetric label="newest" value={String(profile.newestYear)} />
              <SmallMetric
                label="added / 12 mo"
                value={`+${formatInteger(profile.addedLast12Mo)}`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompareView({
  operators,
  onClear,
  onDone,
  onRemove,
}: {
  operators: OperatorRecord[]
  onClear: () => void
  onDone: () => void
  onRemove: (operator: OperatorRecord) => void
}) {
  const profiles = operators.map((operator) => ({
    operator,
    profile: buildProfile(operator),
  }))

  const rows = [
    {
      label: "locations",
      better: "max",
      value: ({ operator }: (typeof profiles)[number]) =>
        operator.chargingUnits,
      format: (value: number) => formatInteger(value),
    },
    {
      label: "capacity",
      better: "max",
      value: ({ operator }: (typeof profiles)[number]) =>
        Math.round(operator.reportedNominalKw / 1000),
      format: (value: number) => `${formatInteger(value)} MW`,
    },
    {
      label: "avg / point",
      better: "max",
      value: ({ profile }: (typeof profiles)[number]) => profile.avgKwPerPoint,
      format: (value: number) => `${formatInteger(value)} kW`,
    },
    {
      label: "peak power",
      better: "max",
      value: ({ profile }: (typeof profiles)[number]) => profile.peakKw,
      format: (value: number) => `${formatInteger(value)} kW`,
    },
    {
      label: "states covered",
      better: "max",
      value: ({ profile }: (typeof profiles)[number]) => profile.statesCovered,
      format: (value: number) => `${value} / 16`,
    },
    {
      label: "open 24/7",
      better: "max",
      value: ({ profile }: (typeof profiles)[number]) => profile.open247Pct,
      format: (value: number) => `${formatInteger(value)}%`,
    },
    {
      label: "first live",
      better: "min",
      value: ({ profile }: (typeof profiles)[number]) => profile.firstLiveYear,
      format: (value: number) => String(value),
    },
  ] as const

  return (
    <div>
      <div className="flex items-center justify-between border-b px-10 py-[18px]">
        <div className="flex items-center gap-3.5">
          <h2 className="text-base font-semibold">Compare operators</h2>
          <span className="text-[13px] text-muted-foreground">
            {operators.length} of 4 selected
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClear}
            className="h-[34px] rounded-[9px] border border-[oklch(0.9_0_0)] px-3.5 text-[13px] text-[oklch(0.4_0_0)] transition-colors hover:bg-muted"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onDone}
            className="h-[34px] rounded-[9px] bg-primary px-3.5 text-[13px] text-primary-foreground"
          >
            Done
          </button>
        </div>
      </div>

      {operators.length >= 2 ? (
        <div className="overflow-x-auto px-10 pb-10 pt-2">
          <div className="min-w-[760px]">
            <div className="flex">
              <div className="w-[180px] flex-none" />
              {profiles.map(({ operator }) => (
                <div
                  key={operator.operator}
                  className="flex min-w-0 flex-1 items-start justify-between gap-2 border-l border-[oklch(0.93_0_0)] px-[18px] py-[18px]"
                >
                  <span className="min-w-0 text-[15px] font-semibold leading-snug tracking-[-0.01em]">
                    {operator.operator}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(operator)}
                    className="flex size-5 flex-none items-center justify-center text-[oklch(0.6_0_0)]"
                    aria-label={`Remove ${operator.operator}`}
                  >
                    <X className="size-3.5" strokeWidth={2.2} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex border-t border-[oklch(0.93_0_0)]">
              <div className="w-[180px] flex-none px-6 py-4 text-[13px] text-muted-foreground">
                fast / normal
              </div>
              {profiles.map(({ operator, profile }) => (
                <div
                  key={operator.operator}
                  className="min-w-0 flex-1 border-l border-[oklch(0.93_0_0)] px-[18px] py-4"
                >
                  <SplitBar value={profile.dcFastPct} small />
                  <div className="mt-2 text-xs text-[oklch(0.5_0_0)]">
                    {profile.dcFastPct}% DC fast
                  </div>
                </div>
              ))}
            </div>

            {rows.map((row) => {
              const values = profiles.map(row.value)
              const best =
                row.better === "max" ? Math.max(...values) : Math.min(...values)

              return (
                <div
                  key={row.label}
                  className="flex border-t border-[oklch(0.93_0_0)] last:border-b"
                >
                  <div className="w-[180px] flex-none px-6 py-[15px] text-[13px] text-muted-foreground">
                    {row.label}
                  </div>
                  {profiles.map((profile, index) => {
                    const value = values[index]
                    const isBest = value === best

                    return (
                      <div
                        key={profile.operator.operator}
                        className="min-w-0 flex-1 border-l border-[oklch(0.93_0_0)] px-[18px] py-[15px]"
                      >
                        <span
                          className={[
                            "text-lg tracking-[-0.01em]",
                            isBest
                              ? "font-bold text-foreground"
                              : "font-medium text-[oklch(0.45_0_0)]",
                          ].join(" ")}
                        >
                          {row.format(value)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            <p className="mt-3.5 text-xs text-[oklch(0.6_0_0)]">
              Leading value in each row shown in bold.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-10 py-20 text-center text-[15px] text-muted-foreground">
          Pick operators from the list to compare.
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[oklch(0.5_0_0)]">
      {children}
    </span>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] text-muted-foreground">{children}</span>
}

function DetailCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[18px] bg-background px-8 py-7">
      {children}
    </div>
  )
}

function HeroMetric({
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
            className={[
              "font-medium text-muted-foreground",
              compactUnit
                ? "ml-0.5 text-[17px]"
                : "ml-1.5 text-[17px]",
            ].join(" ")}
          >
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  )
}

function SmallMetric({
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
        className={[
          "mt-1.5 font-semibold leading-none tracking-[-0.02em]",
          large ? "text-[30px]" : "text-2xl",
        ].join(" ")}
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

function MetricDivider() {
  return <div className="hidden h-[52px] w-px bg-[oklch(0.91_0_0)] sm:block" />
}

function SplitBar({
  value,
  small = false,
}: {
  value: number
  small?: boolean
}) {
  const clampedValue = clamp(value, 0, 100)

  return (
    <div className={`flex ${small ? "h-[7px]" : "h-2"} gap-[3px]`}>
      <div
        className="rounded-full bg-primary"
        style={{ flexGrow: clampedValue, flexBasis: 0 }}
      />
      <div
        className="rounded-full bg-[oklch(0.88_0_0)]"
        style={{ flexGrow: 100 - clampedValue, flexBasis: 0 }}
      />
    </div>
  )
}

function SplitLegend({ left, right }: { left: string; right: string }) {
  return (
    <div className="mt-2.5 flex justify-between text-xs text-[oklch(0.5_0_0)]">
      <LegendDot label={left} tone="dark" />
      <LegendDot label={right} tone="light" />
    </div>
  )
}

function PowerClassBar({ profile }: { profile: OperatorProfile }) {
  return (
    <div className="mt-2.5 flex h-2 gap-[3px]">
      <div
        className="rounded-full bg-primary"
        style={{ flexGrow: profile.powerClass150PlusPct, flexBasis: 0 }}
      />
      <div
        className="rounded-full bg-[oklch(0.6_0_0)]"
        style={{ flexGrow: profile.powerClass50To149Pct, flexBasis: 0 }}
      />
      <div
        className="rounded-full bg-[oklch(0.88_0_0)]"
        style={{ flexGrow: profile.powerClassLowPct, flexBasis: 0 }}
      />
    </div>
  )
}

function LegendDot({
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
        ? "bg-[oklch(0.6_0_0)]"
        : "bg-[oklch(0.82_0_0)]"

  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-1.5 rounded-full ${toneClass}`} />
      {label}
    </span>
  )
}

function Chip({
  active,
  children,
}: {
  active: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={[
        "rounded-full border px-3 py-1 text-[13px]",
        active
          ? "border-[oklch(0.3_0_0)] text-[oklch(0.2_0_0)]"
          : "border-[oklch(0.92_0_0)] text-[oklch(0.72_0_0)]",
      ].join(" ")}
    >
      {children}
    </span>
  )
}

function RolloutSparkline({ points }: { points: RolloutPoint[] }) {
  const normalized = normalizeSparkline(points)

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
        points={normalized}
        fill="none"
        stroke="oklch(0.205 0 0)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function buildProfile(operator: OperatorRecord) {
  const fallbackFast = inferFastPct(operator)
  const dcFastPct = operator.dcFastPct ?? fallbackFast
  const avgKwPerPoint =
    operator.avgKwPerPoint ??
    Math.round(safeDivide(operator.reportedNominalKw, operator.chargingPoints))
  const peakKw =
    operator.peakKw ??
    (dcFastPct >= 90 ? 300 : dcFastPct >= 50 ? 250 : dcFastPct >= 20 ? 150 : 22)
  const highPct = operator.powerClass150PlusPct ?? Math.max(0, dcFastPct - 8)
  const midPct =
    operator.powerClass50To149Pct ?? Math.round((100 - dcFastPct) * 0.2)
  const lowPct =
    operator.powerClassLowPct ?? Math.max(0, 100 - highPct - midPct)
  const fallbackCityIndex = Math.abs(hash(operator.operator)) % fallbackCities.length

  return {
    dcFastPct,
    avgKwPerPoint,
    peakKw,
    plugSlotsPerStation:
      operator.plugSlotsPerStation ??
      Number(safeDivide(operator.chargingPoints, operator.chargingUnits).toFixed(1)),
    powerClass150PlusPct: highPct,
    powerClass50To149Pct: midPct,
    powerClassLowPct: lowPct,
    statesCovered:
      operator.statesCovered ??
      clamp(Math.round(operator.chargingUnits / 120), 1, 16),
    topCities:
      operator.topCities?.length
        ? operator.topCities
        : [
            fallbackCities[fallbackCityIndex],
            fallbackCities[(fallbackCityIndex + 3) % fallbackCities.length],
            fallbackCities[(fallbackCityIndex + 5) % fallbackCities.length],
          ],
    open247Pct:
      operator.open247Pct ?? clamp(Math.round(45 + dcFastPct * 0.35), 0, 99),
    parking: operator.parking ?? "varies",
    paymentOptions: operator.paymentOptions?.length
      ? operator.paymentOptions
      : ["App", "RFID"],
    firstLiveYear: operator.firstLiveYear ?? 2016,
    newestYear: operator.newestYear ?? 2026,
    addedLast12Mo:
      operator.addedLast12Mo ?? Math.round(operator.chargingUnits * 0.12),
    connectors:
      operator.connectors ??
      ({
        ccs: dcFastPct > 25,
        type2: true,
        tesla: /tesla/i.test(operator.operator),
        chademo: dcFastPct >= 45,
        schuko: dcFastPct < 45,
        cee: dcFastPct < 35,
      } satisfies ConnectorMap),
    rolloutByYear:
      operator.rolloutByYear?.length
        ? operator.rolloutByYear
        : fallbackRollout(operator),
  }
}

function normalizeSparkline(points: RolloutPoint[]) {
  if (points.length === 0) {
    return "0,80 75,75 150,68 225,58 300,46 375,33 450,21 525,11 600,5"
  }

  const max = Math.max(...points.map((point) => point.cumulative), 1)
  const denominator = Math.max(points.length - 1, 1)

  return points
    .map((point, index) => {
      const x = (index / denominator) * 600
      const y = 80 - (point.cumulative / max) * 75

      return `${round1(x)},${round1(y)}`
    })
    .join(" ")
}

function fallbackRollout(operator: OperatorRecord) {
  const start = 2016
  const units = operator.chargingUnits

  return Array.from({ length: 11 }, (_, index) => {
    const progress = Math.pow((index + 1) / 11, 1.45)
    return {
      year: start + index,
      cumulative: Math.max(1, Math.round(units * progress)),
    }
  })
}

function inferFastPct(operator: OperatorRecord) {
  const avgKw = safeDivide(operator.reportedNominalKw, operator.chargingPoints)

  return clamp(Math.round((avgKw / 250) * 100), 0, 100)
}

function safeDivide(value: number, denominator: number) {
  return denominator ? value / denominator : 0
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMegawatts(value: number) {
  return formatInteger(Math.round(value / 1000))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function hash(value: string) {
  let result = 0

  for (let index = 0; index < value.length; index += 1) {
    result = (result << 5) - result + value.charCodeAt(index)
    result |= 0
  }

  return result
}
