import type { ConnectorMap } from "./operatorTypes"

export type RegionRolloutPoint = {
  year: number
  addedUnits: number
  cumulativeUnits: number
  cumulativeChargingPoints: number
  cumulativeReportedNominalKw: number
}

export type RegionBreakdownItem = {
  id: string
  name: string
  slug: string
  rank: number
  chargingUnits: number
  chargingPoints: number
  reportedNominalKw: number
  dcFastPct: number
  operatorCount: number
}

export type RegionTopOperator = {
  operator: string
  chargingUnits: number
  chargingPoints: number
  reportedNominalKw: number
  reportedNominalKwPct: number
  chargingUnitsPct: number
  chargingPointsPct: number
}

export type RegionPayment = {
  appPct: number
  rfidPct: number
  creditCardPct: number
  debitCardPct: number
  plugChargePct: number
  freePct: number
}

export type RegionParking = {
  unrestrictedPct: number
  limitedPct: number
  unknownPct: number
}

export type RegionConnectorUnitPct = Record<keyof ConnectorMap, number>

export type RegionRecord = {
  id: string
  type: "national" | "state" | "district" | "city"
  name: string
  slug: string
  rank?: number
  chargingUnits: number
  chargingPoints: number
  reportedNominalKw: number
  dcFastChargingPoints: number
  dcFastPct: number
  normalChargingPoints: number
  normalPct: number
  avgKwPerPoint: number
  peakKw: number
  plugSlotsPerUnit: number
  powerClass150PlusPct: number
  powerClass50To149Pct: number
  powerClassLowPct: number
  operatorCount: number
  districtCount: number
  cityCount: number
  open247Pct: number
  parking: RegionParking
  payment: RegionPayment
  connectors: ConnectorMap
  connectorUnitPct: RegionConnectorUnitPct
  addedLast12Mo: {
    chargingUnits: number
    chargingPoints: number
    reportedNominalKw: number
  }
  firstLiveDate: string
  newestDate: string
  topOperators: RegionTopOperator[]
  topOperatorReportedNominalKwPct: number
  top5ReportedNominalKwPct: number
  rolloutByYear: RegionRolloutPoint[]
  topDistricts?: RegionBreakdownItem[]
  topCities?: RegionBreakdownItem[]
}

export type RegionIndex = {
  generatedThrough: string
  national: RegionRecord
}

export type RegionStatesIndex = {
  generatedThrough: string
  states: RegionRecord[]
}

export type GermanyStatePath = {
  slug: string
  abbr: string
  name: string
  d: string
  cx: number
  cy: number
}

export type GermanyStatePaths = {
  generatedFrom: string
  viewBox: {
    w: number
    h: number
  }
  states: GermanyStatePath[]
}
