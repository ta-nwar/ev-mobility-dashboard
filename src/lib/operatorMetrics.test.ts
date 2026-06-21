import { describe, expect, it } from "vitest"

import {
  buildProfile,
  clamp,
  normalizeSparkline,
  safeDivide,
} from "./operatorMetrics"
import type { OperatorRecord } from "./operatorTypes"

const baseOperator: OperatorRecord = {
  operator: "Example Charging GmbH",
  chargingUnits: 10,
  chargingPoints: 20,
  reportedNominalKw: 1_000,
}

describe("operator metric helpers", () => {
  it("uses source rollups when present", () => {
    const profile = buildProfile({
      ...baseOperator,
      dcFastPct: 64,
      avgKwPerPoint: 50,
      peakKw: 300,
      plugSlotsPerStation: 2.2,
      powerClass150PlusPct: 40,
      powerClass50To149Pct: 30,
      powerClassLowPct: 30,
      statesCovered: 8,
      topCities: ["Berlin", "Hamburg"],
      open247Pct: 75,
      parking: "free",
      paymentOptions: ["App"],
      firstLiveYear: 2019,
      newestYear: 2026,
      addedLast12Mo: 4,
      connectors: { ccs: true, type2: false },
      rolloutByYear: [{ year: 2026, cumulative: 10 }],
    })

    expect(profile).toMatchObject({
      dcFastPct: 64,
      avgKwPerPoint: 50,
      peakKw: 300,
      plugSlotsPerStation: 2.2,
      powerClass150PlusPct: 40,
      powerClass50To149Pct: 30,
      powerClassLowPct: 30,
      statesCovered: 8,
      topCities: ["Berlin", "Hamburg"],
      open247Pct: 75,
      parking: "free",
      paymentOptions: ["App"],
      firstLiveYear: 2019,
      newestYear: 2026,
      addedLast12Mo: 4,
      connectors: { ccs: true, type2: false },
      rolloutByYear: [{ year: 2026, cumulative: 10 }],
    })
  })

  it("creates bounded fallback metrics for legacy operator records", () => {
    const profile = buildProfile(baseOperator)

    expect(profile.dcFastPct).toBe(20)
    expect(profile.avgKwPerPoint).toBe(50)
    expect(profile.peakKw).toBe(150)
    expect(profile.plugSlotsPerStation).toBe(2)
    expect(profile.statesCovered).toBe(1)
    expect(profile.open247Pct).toBe(52)
    expect(profile.paymentOptions).toEqual(["App", "RFID"])
    expect(profile.rolloutByYear).toHaveLength(11)
  })

  it("normalizes rollout points into the sparkline viewport", () => {
    expect(
      normalizeSparkline([
        { year: 2024, cumulative: 10 },
        { year: 2025, cumulative: 20 },
        { year: 2026, cumulative: 40 },
      ]),
    ).toBe("0,61.3 300,42.5 600,5")
  })

  it("handles numeric guard rails", () => {
    expect(safeDivide(10, 0)).toBe(0)
    expect(safeDivide(10, 2)).toBe(5)
    expect(clamp(120, 0, 100)).toBe(100)
    expect(clamp(-2, 0, 100)).toBe(0)
  })
})
