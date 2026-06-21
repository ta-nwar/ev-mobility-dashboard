# Data Pipeline

The app serves static data from `public/data/`.

## Source Files

```text
public/data/chargers.clean.parquet
public/data/operators.json
```

`chargers.clean.parquet` is the cleaned Bundesnetzagentur charging register.
`operators.json` is the app-ready operator index generated from that parquet.

## Regenerating Operators

Run:

```powershell
npm run build:data
```

This executes:

```text
scripts/build_operator_index.py
```

The script uses Python DuckDB. If a fresh machine does not have it installed,
install it in the active Python environment:

```powershell
python -m pip install duckdb
```

## Generated JSON Shape

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

## Metric Definitions

Current rollups:

- Capacity: sum of `nominal_power_kw`.
- Locations: station row count.
- Charging points: sum of `charging_points`.
- DC-fast share: charging points where `charger_type` is
  `Schnellladeeinrichtung` divided by total charging points.
- Average kW per point: summed nominal kW divided by summed charging points.
- Peak: max `max_plug_power_kw`.
- Power classes: charging points grouped by max plug power:
  `150+`, `50-149`, and `<50` or missing.
- States covered: distinct `state`.
- Top cities: top three cities by station count.
- Open 24/7: station share where `opening_hours` is `247`.
- Added last 12 months: station count after the latest source date minus
  twelve months.
- Rollout: cumulative station counts by commissioned year.

## Known Caveats

- `opening_hours`, `parking_info`, and `payment_systems` are source strings with
  mixed completeness. The script intentionally maps them to simple dashboard
  labels.
- Connector availability is operator-level `bool_or` across station records.
- The geography panel still uses a placeholder; sampled lat/lon rendering is a
  planned next step.

## When To Change The Script

Prefer adding new derived fields in `scripts/build_operator_index.py` instead of
computing them in React. The browser should mostly format and display app-ready
records.
