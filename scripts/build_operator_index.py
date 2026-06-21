import json
from pathlib import Path

import duckdb


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "data" / "chargers.clean.parquet"
TARGET = ROOT / "public" / "data" / "operators.json"


def main() -> None:
    rows = duckdb.sql(
        f"""
        select
          operator,
          count(*)::integer as charging_units,
          coalesce(sum(charging_points), 0)::integer as charging_points,
          coalesce(sum(nominal_power_kw), 0)::double as reported_nominal_kw
        from read_parquet('{SOURCE.as_posix()}')
        where operator is not null
          and trim(operator) <> ''
        group by operator
        order by reported_nominal_kw desc, charging_units desc, operator asc
        """
    ).fetchall()

    operators = [
        {
            "operator": operator,
            "chargingUnits": charging_units,
            "chargingPoints": charging_points,
            "reportedNominalKw": round(reported_nominal_kw, 1),
        }
        for operator, charging_units, charging_points, reported_nominal_kw in rows
    ]

    TARGET.write_text(
        json.dumps(
            {
                "generatedFrom": "public/data/chargers.clean.parquet",
                "operatorCount": len(operators),
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
