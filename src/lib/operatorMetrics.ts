import type { ConnectorMap, OperatorRecord, RolloutPoint } from "./operatorTypes"

export const connectorLabels: Array<[keyof ConnectorMap, string]> = [
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

export type OperatorProfile = ReturnType<typeof buildProfile>

export function buildProfile(operator: OperatorRecord) {
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
  const fallbackCityIndex =
    Math.abs(hash(operator.operator)) % fallbackCities.length

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

export function normalizeSparkline(points: RolloutPoint[]) {
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

export function safeDivide(value: number, denominator: number) {
  return denominator ? value / denominator : 0
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
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
