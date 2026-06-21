import { formatInteger, formatMegawatts } from "@/lib/operatorFormat"
import type { OperatorRecord } from "@/lib/operatorTypes"

import { SectionLabel, SplitBar, SplitLegend } from "./OperatorPrimitives"

export function OperatorOverview({
  operators,
  operatorCount,
  nationalFastPct,
  onSelect,
}: {
  operators: OperatorRecord[]
  operatorCount: number
  nationalFastPct: number
  onSelect: (operator: OperatorRecord) => void
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
