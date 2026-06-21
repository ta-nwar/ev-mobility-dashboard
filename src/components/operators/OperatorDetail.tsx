import { Plus } from "lucide-react"

import { formatInteger } from "@/lib/operatorFormat"
import {
  connectorLabels,
  safeDivide,
  type OperatorProfile,
} from "@/lib/operatorMetrics"
import type { OperatorRecord } from "@/lib/operatorTypes"

import {
  Chip,
  DetailCell,
  FieldLabel,
  HeroMetric,
  LegendDot,
  MetricDivider,
  PowerClassBar,
  RolloutSparkline,
  SectionLabel,
  SmallMetric,
  SplitBar,
} from "./OperatorPrimitives"

export function OperatorDetail({
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
