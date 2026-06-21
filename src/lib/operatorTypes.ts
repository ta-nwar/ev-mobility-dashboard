export type ConnectorMap = {
  ccs?: boolean
  type2?: boolean
  tesla?: boolean
  chademo?: boolean
  schuko?: boolean
  cee?: boolean
  mcs?: boolean
}

export type RolloutPoint = {
  year: number
  cumulative: number
}

export type OperatorRecord = {
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

export type OperatorIndex = {
  operatorCount: number
  national?: {
    dcFastPct?: number
    chargingPoints?: number
    reportedNominalKw?: number
  }
  operators: OperatorRecord[]
}
