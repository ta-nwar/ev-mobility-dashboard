# Data Pipeline

The app serves static data from `public/data/`.

## Source Files

```text
public/data/chargers.clean.parquet
public/data/operators.json
public/data/regions/
```

`chargers.clean.parquet` is the cleaned Bundesnetzagentur charging register.
`operators.json` is the app-ready operator index generated from that parquet.
`regions/` contains app-ready regional aggregates generated from the same
parquet.

## Regenerating Data

Run:

```powershell
npm run build:data
```

This executes:

```text
scripts/build_operator_index.py
scripts/build_region_index.py
```

The script uses Python DuckDB. If a fresh machine does not have it installed,
install it in the active Python environment:

```powershell
python -m pip install duckdb
```

## Generated JSON Shape

### Operators

Top-level fields:

- `generatedFrom`: source parquet path.
- `generatedThrough`: latest commissioning date in the source.
- `operatorCount`: number of distinct non-empty operators.
- `national`: national aggregates used by overview/detail comparisons.
- `operators`: array sorted by reported nominal capacity descending.

Each operator record includes:

- Identity and rank: `operator`, `rank`.
- Scale: `chargingUnits`, `chargingPoints`, `reportedNominalKw`.
- Fast charging: `dcFastChargingPoints`, `dcFastPct`.
- Power: `avgKwPerPoint`, `peakKw`, power-class percentages.
- Network: `plugSlotsPerStation`, connector booleans.
- Geography: `statesCovered`, `topCities`.
- Access: `open247Pct`, `parking`, `paymentOptions`.
- Timeline: `firstLiveYear`, `newestYear`, `addedLast12Mo`,
  `rolloutByYear`.

### Regions

Regional data is generated at national, state, district, and city grains:

```text
public/data/regions/index.json
public/data/regions/states.json
public/data/regions/germany-states-paths.json
public/data/regions/districts/by-state/{stateSlug}.json
public/data/regions/cities/by-district/{stateSlug}/{districtSlug}.json
```

`index.json` contains source metadata, national totals, counts for each
regional grain, distinct city-name count, and file templates. `states.json`
contains all 16 state summaries and the top district/city summaries used by the
current Regions UI. `germany-states-paths.json` contains the deployable SVG path
data for the state map. District and city files are generated for future deeper
drill-downs; each state points to its district file, and each district points to
its city file.

Each regional record includes:

- Identity and rank: `id`, `type`, `name`, `slug`, `rank`, plus `parent` for
  districts and cities.
- Scale: `chargingUnits`, `chargingPoints`, `reportedNominalKw`.
- Fast charging: `dcFastChargingPoints`, `dcFastPct`.
- Power: `avgKwPerPoint`, `peakKw`, `plugSlotsPerUnit`, power-class
  percentages.
- Market structure: `operatorCount`, `topOperators`, top-operator share
  percentages.
- Geography: `districtCount`, `cityCount`, `topDistricts`, `topCities` where
  applicable.
- Access: `open247Pct`, `parking`, `payment`, connector booleans, connector
  unit-share percentages.
- Timeline: `firstLiveDate`, `newestDate`, `addedLast12Mo`, `rolloutByYear`.

## Metric Definitions

Current rollups:

- Reported nominal kW: sum of `nominal_power_kw`.
- Charging units: BNetzA charging-unit row count.
- Charging points: sum of `charging_points`.
- DC-fast share: charging points where `charger_type` is
  `Schnellladeeinrichtung` divided by total charging points.
- Average kW per point: summed nominal kW divided by summed charging points.
- Peak: max `max_plug_power_kw`.
- Power classes: charging points grouped by max plug power:
  `150+`, `50-149`, and `<50` or missing.
- States covered: distinct `state`.
- Top cities: top cities by reported nominal kW, then charging units.
- Open 24/7: charging-unit share where `opening_hours` is `247`.
- Added last 12 months: charging units, charging points, and reported nominal
  kW after the latest source date minus twelve months.
- Rollout: yearly additions and cumulative charging-unit counts by
  commissioned year.
- Regional rank: by `reportedNominalKw` descending, then `chargingUnits`
  descending, then name ascending.
- Regional drill-down grain: state, district, and city names from the cleaned
  parquet. These are infrastructure regions, not population accessibility
  catchments.
- City grain: state + district + city. Nationally, this can be larger than the
  count of distinct city names because names can repeat across parent regions.

## Known Caveats

- `opening_hours`, `parking_info`, and `payment_systems` are source strings with
  mixed completeness. The script intentionally maps them to simple dashboard
  labels.
- Connector availability is operator-level `bool_or` across station records.
- The geography panel still uses a placeholder; sampled lat/lon rendering is a
  planned next step.
- Regional `chargingUnits` are BNetzA charging-unit records, not clustered
  physical sites.
- Regional `reportedNominalKw` is source-reported nominal power, not utilization
  or grid capacity.
- The regional files intentionally avoid one giant nested JSON bundle. They are
  materialized static aggregates, split for lazy drill-down loading.
- Detailed regional metric definitions live in `docs/region-metrics.md`.

## When To Change The Script

Prefer adding new derived operator fields in `scripts/build_operator_index.py`
and new derived regional fields in `scripts/build_region_index.py` instead of
computing them in React. The browser should mostly format and display app-ready
records.
