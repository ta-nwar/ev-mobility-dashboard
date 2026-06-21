import json
from collections import defaultdict
from pathlib import Path

import duckdb


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "data" / "chargers.clean.parquet"
TARGET = ROOT / "public" / "data" / "operators.json"


def pct(part: float, total: float) -> int:
    if not total:
        return 0

    return round((part / total) * 100)


def main() -> None:
    source_path = SOURCE.as_posix()
    max_commissioned = duckdb.sql(
        f"""
        select max(commissioned_at)
        from read_parquet('{source_path}')
        """
    ).fetchone()[0]

    rows = duckdb.sql(
        f"""
        select
          operator,
          count(*)::integer as charging_units,
          coalesce(sum(charging_points), 0)::integer as charging_points,
          coalesce(sum(nominal_power_kw), 0)::double as reported_nominal_kw,
          coalesce(sum(case
            when charger_type = 'Schnellladeeinrichtung'
            then charging_points
            else 0
          end), 0)::integer as dc_fast_points,
          coalesce(max(max_plug_power_kw), 0)::double as peak_kw,
          coalesce(sum(plug_slot_count), 0)::integer as plug_slots,
          coalesce(sum(case
            when max_plug_power_kw >= 150 then charging_points
            else 0
          end), 0)::integer as power_150_plus_points,
          coalesce(sum(case
            when max_plug_power_kw >= 50 and max_plug_power_kw < 150
            then charging_points
            else 0
          end), 0)::integer as power_50_149_points,
          coalesce(sum(case
            when max_plug_power_kw < 50 or max_plug_power_kw is null
            then charging_points
            else 0
          end), 0)::integer as power_low_points,
          count(distinct state)::integer as states_covered,
          coalesce(sum(case when opening_hours = '247' then 1 else 0 end), 0)::integer as open_247_units,
          coalesce(sum(case
            when commissioned_at >= date '{max_commissioned}' - interval 12 month
            then 1
            else 0
          end), 0)::integer as added_last_12mo,
          extract(year from min(commissioned_at))::integer as first_live_year,
          extract(year from max(commissioned_at))::integer as newest_year,
          bool_or(coalesce(has_ccs, false)) as has_ccs,
          bool_or(coalesce(has_type2, false)) as has_type2,
          bool_or(coalesce(has_tesla, false)) as has_tesla,
          bool_or(coalesce(has_chademo, false)) as has_chademo,
          bool_or(coalesce(has_schuko, false)) as has_schuko,
          bool_or(coalesce(has_cee, false)) as has_cee,
          bool_or(coalesce(has_mcs, false)) as has_mcs,
          bool_or(contains(coalesce(payment_systems, ''), 'Onlinezahlungsverfahren')) as has_app_payment,
          bool_or(contains(coalesce(payment_systems, ''), 'RFID')) as has_rfid_payment,
          bool_or(contains(coalesce(payment_systems, ''), 'Kreditkarte')) as has_credit_card_payment,
          bool_or(contains(coalesce(payment_systems, ''), 'Debitkarte')) as has_debit_card_payment,
          bool_or(contains(coalesce(payment_systems, ''), 'Plug & Charge')) as has_plug_charge_payment,
          coalesce(sum(case
            when parking_info ilike '%keine beschr%' then 1
            else 0
          end), 0)::integer as unrestricted_parking_units,
          coalesce(sum(case
            when parking_info ilike '%kunden%' or parking_info ilike '%besucher%'
            then 1
            else 0
          end), 0)::integer as limited_parking_units
        from read_parquet('{source_path}')
        where operator is not null
          and trim(operator) <> ''
        group by operator
        order by reported_nominal_kw desc, charging_units desc, operator asc
        """
    ).fetchall()

    top_cities = defaultdict(list)
    for operator, city, _count in duckdb.sql(
        f"""
        select operator, city, count(*) as units
        from read_parquet('{source_path}')
        where operator is not null
          and trim(operator) <> ''
          and city is not null
          and trim(city) <> ''
        group by operator, city
        order by operator asc, units desc, city asc
        """
    ).fetchall():
        if len(top_cities[operator]) < 3:
            top_cities[operator].append(city)

    yearly_counts = defaultdict(lambda: defaultdict(int))
    for operator, year, count in duckdb.sql(
        f"""
        select
          operator,
          extract(year from commissioned_at)::integer as commissioned_year,
          count(*)::integer as units
        from read_parquet('{source_path}')
        where operator is not null
          and trim(operator) <> ''
          and commissioned_at is not null
        group by operator, commissioned_year
        order by operator asc, commissioned_year asc
        """
    ).fetchall():
        yearly_counts[operator][year] += count

    operators = []
    for rank, row in enumerate(rows, start=1):
        (
            operator,
            charging_units,
            charging_points,
            reported_nominal_kw,
            dc_fast_points,
            peak_kw,
            plug_slots,
            power_150_plus_points,
            power_50_149_points,
            power_low_points,
            states_covered,
            open_247_units,
            added_last_12mo,
            first_live_year,
            newest_year,
            has_ccs,
            has_type2,
            has_tesla,
            has_chademo,
            has_schuko,
            has_cee,
            has_mcs,
            has_app_payment,
            has_rfid_payment,
            has_credit_card_payment,
            has_debit_card_payment,
            has_plug_charge_payment,
            unrestricted_parking_units,
            limited_parking_units,
        ) = row

        yearly = []
        cumulative = 0
        for year, count in sorted(yearly_counts[operator].items()):
            cumulative += count
            yearly.append({"year": year, "cumulative": cumulative})

        payment_options = []
        if has_app_payment:
            payment_options.append("App")
        if has_rfid_payment:
            payment_options.append("RFID")
        if has_credit_card_payment:
            payment_options.append("Credit card (NFC)")
        if has_debit_card_payment:
            payment_options.append("Debit card")
        if has_plug_charge_payment:
            payment_options.append("Plug & Charge")

        if unrestricted_parking_units > charging_units * 0.5:
            parking = "free"
        elif limited_parking_units > charging_units * 0.5:
            parking = "limited"
        else:
            parking = "varies"

        operators.append(
            {
                "operator": operator,
                "rank": rank,
                "chargingUnits": charging_units,
                "chargingPoints": charging_points,
                "reportedNominalKw": round(reported_nominal_kw, 1),
                "dcFastChargingPoints": dc_fast_points,
                "dcFastPct": pct(dc_fast_points, charging_points),
                "avgKwPerPoint": round(reported_nominal_kw / charging_points) if charging_points else 0,
                "peakKw": round(peak_kw),
                "plugSlotsPerStation": round(plug_slots / charging_units, 1) if charging_units else 0,
                "powerClass150PlusPct": pct(power_150_plus_points, charging_points),
                "powerClass50To149Pct": pct(power_50_149_points, charging_points),
                "powerClassLowPct": pct(power_low_points, charging_points),
                "statesCovered": states_covered,
                "topCities": top_cities[operator],
                "open247Pct": pct(open_247_units, charging_units),
                "parking": parking,
                "paymentOptions": payment_options,
                "firstLiveYear": first_live_year,
                "newestYear": newest_year,
                "addedLast12Mo": added_last_12mo,
                "connectors": {
                    "ccs": bool(has_ccs),
                    "type2": bool(has_type2),
                    "tesla": bool(has_tesla),
                    "chademo": bool(has_chademo),
                    "schuko": bool(has_schuko),
                    "cee": bool(has_cee),
                    "mcs": bool(has_mcs),
                },
                "rolloutByYear": yearly,
            }
        )

    total_points = sum(operator["chargingPoints"] for operator in operators)
    total_fast_points = sum(operator["dcFastChargingPoints"] for operator in operators)

    TARGET.write_text(
        json.dumps(
            {
                "generatedFrom": "public/data/chargers.clean.parquet",
                "generatedThrough": str(max_commissioned),
                "operatorCount": len(operators),
                "national": {
                    "dcFastPct": pct(total_fast_points, total_points),
                    "chargingPoints": total_points,
                    "reportedNominalKw": round(
                        sum(operator["reportedNominalKw"] for operator in operators),
                        1,
                    ),
                },
                "operators": operators,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    print(f"Wrote {len(operators):,} operators to {TARGET}")


if __name__ == "__main__":
    main()
