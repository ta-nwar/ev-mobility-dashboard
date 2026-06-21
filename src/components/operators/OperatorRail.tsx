import { Check, Plus, Search } from "lucide-react"
import { useRef, useState } from "react"

import { formatInteger, formatMegawatts } from "@/lib/operatorFormat"
import type { OperatorRecord } from "@/lib/operatorTypes"
import { cn } from "@/lib/utils"

const railRowHeight = 48
const railOverscan = 8
const railVisibleRows = 40

export function OperatorRail({
  query,
  operatorCount,
  filteredOperators,
  isLoading,
  selectedOperatorId,
  compareIds,
  compareMode,
  onQueryChange,
  onSelect,
  onToggleCompare,
}: {
  query: string
  operatorCount: number
  filteredOperators: OperatorRecord[]
  isLoading: boolean
  selectedOperatorId: string | null
  compareIds: string[]
  compareMode: boolean
  onQueryChange: (query: string) => void
  onSelect: (operator: OperatorRecord) => void
  onToggleCompare: (operator: OperatorRecord) => void
}) {
  const [railScrollTop, setRailScrollTop] = useState(0)
  const railScrollerRef = useRef<HTMLDivElement | null>(null)

  const handleQueryChange = (value: string) => {
    onQueryChange(value)
    setRailScrollTop(0)

    if (railScrollerRef.current) {
      railScrollerRef.current.scrollTop = 0
    }
  }

  const railStartIndex = Math.max(
    0,
    Math.floor(railScrollTop / railRowHeight) - railOverscan,
  )
  const railEndIndex = Math.min(
    filteredOperators.length,
    railStartIndex + railVisibleRows + railOverscan * 2,
  )
  const railOperators = filteredOperators.slice(railStartIndex, railEndIndex)
  const railCountLabel = query.trim()
    ? `${formatInteger(filteredOperators.length)} of ${formatInteger(operatorCount)}`
    : `${formatInteger(operatorCount)} operators`

  return (
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
            onChange={(event) => handleQueryChange(event.target.value)}
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
                    compareMode ? onToggleCompare(operator) : onSelect(operator)
                  }
                  aria-pressed={isActive}
                  className={cn(
                    "absolute left-0 right-0 flex h-12 items-center justify-between gap-3 border-b border-[oklch(0.94_0_0)] px-3 text-left transition-colors hover:bg-[oklch(0.985_0_0)]",
                    isActive
                      ? "rounded-lg border-b-transparent bg-[oklch(0.95_0_0)]"
                      : "bg-transparent",
                  )}
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
  )
}
