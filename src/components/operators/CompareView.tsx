import { X } from "lucide-react"

import { formatInteger } from "@/lib/operatorFormat"
import { buildProfile } from "@/lib/operatorMetrics"
import type { OperatorRecord } from "@/lib/operatorTypes"
import { cn } from "@/lib/utils"

import { SplitBar } from "./OperatorPrimitives"

export function CompareView({
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
                          className={cn(
                            "text-lg tracking-[-0.01em]",
                            isBest
                              ? "font-bold text-foreground"
                              : "font-medium text-[oklch(0.45_0_0)]",
                          )}
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
