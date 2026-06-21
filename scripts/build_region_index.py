import json
import hashlib
import math
import re
import shutil
import unicodedata
from collections import defaultdict
from pathlib import Path

import duckdb


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "data" / "chargers.clean.parquet"
TARGET_DIR = ROOT / "public" / "data" / "regions"
STATE_BOUNDARIES = ROOT / "public" / "data" / "boundaries" / "germany-states.geojson"

FAST_CHARGER_TYPE = "Schnellladeeinrichtung"
TOP_OPERATOR_LIMIT = 5


def pct(part: float, total: float) -> int:
    if not total:
        return 0

    return round((part / total) * 100)


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug or "region"


def stable_suffix(values: tuple[str, ...]) -> str:
    return hashlib.sha1("|".join(values).encode("utf-8")).hexdigest()[:6]


def unique_slug_lookup(
    rows: list[dict],
    *,
    parent_columns: list[str],
    name_column: str,
) -> dict[tuple[str, ...], str]:
    buckets = defaultdict(list)

    for row in rows:
        parent = tuple(row[column] for column in parent_columns)
        name = row[name_column]
        key = (*parent, name)
        buckets[(parent, slugify(name))].append(key)

    lookup = {}
    for (_parent, base_slug), keys in buckets.items():
        if len(keys) == 1:
            lookup[keys[0]] = base_slug
            continue

        for key in keys:
            lookup[key] = f"{base_slug}-{stable_suffix(key)}"

    return lookup


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":"), default=str),
        encoding="utf-8",
    )


def build_state_svg_paths() -> dict | None:
    if not STATE_BOUNDARIES.exists():
        return None

    geojson = json.loads(STATE_BOUNDARIES.read_text(encoding="utf-8"))
    pad = 8
    target_width = 1000
    min_step = 0.5

    def mercator(coord: list[float]) -> tuple[float, float]:
        lon, lat = coord
        lat_rad = math.radians(lat)
        return (
            math.radians(lon),
            math.log(math.tan(math.pi / 4 + lat_rad / 2)),
        )

    def rings(geometry: dict) -> list[list[list[float]]]:
        polygons = (
            [geometry["coordinates"]]
            if geometry["type"] == "Polygon"
            else geometry["coordinates"]
        )
        return [ring for polygon in polygons for ring in polygon]

    projected = [
        mercator(coord)
        for feature in geojson["features"]
        for ring in rings(feature["geometry"])
        for coord in ring
    ]
    min_x = min(point[0] for point in projected)
    max_x = max(point[0] for point in projected)
    min_y = min(point[1] for point in projected)
    max_y = max(point[1] for point in projected)
    scale = (target_width - pad * 2) / (max_x - min_x)
    height = round((max_y - min_y) * scale + pad * 2)

    def project(coord: list[float]) -> tuple[float, float]:
        x, y = mercator(coord)
        return (
            round(pad + (x - min_x) * scale, 1),
            round(pad + (max_y - y) * scale, 1),
        )

    def distance(a: tuple[float, float], b: tuple[float, float]) -> float:
        return math.hypot(a[0] - b[0], a[1] - b[1])

    def ring_area(points: list[tuple[float, float]]) -> float:
        return sum(
            points[index][0] * points[index + 1][1]
            - points[index + 1][0] * points[index][1]
            for index in range(len(points) - 1)
        ) / 2

    def ring_centroid(points: list[tuple[float, float]]) -> tuple[float, float]:
        area = ring_area(points)
        if not area:
            return (
                sum(point[0] for point in points) / len(points),
                sum(point[1] for point in points) / len(points),
            )

        cx = 0.0
        cy = 0.0
        for index in range(len(points) - 1):
            x1, y1 = points[index]
            x2, y2 = points[index + 1]
            factor = x1 * y2 - x2 * y1
            cx += (x1 + x2) * factor
            cy += (y1 + y2) * factor

        return (cx / (6 * area), cy / (6 * area))

    def simplify_ring(ring: list[list[float]]) -> list[tuple[float, float]]:
        kept: list[tuple[float, float]] = []
        for point in [project(coord) for coord in ring]:
            if not kept or distance(point, kept[-1]) >= min_step:
                kept.append(point)
        if kept and distance(kept[0], kept[-1]) > 0:
            kept.append(kept[0])
        return kept

    states = []
    for feature in geojson["features"]:
        paths = []
        largest_ring = None
        largest_area = -1.0
        for ring in rings(feature["geometry"]):
            points = simplify_ring(ring)
            if len(points) < 4:
                continue
            paths.append("M" + "L".join(f"{x},{y}" for x, y in points) + "Z")
            area = abs(ring_area(points))
            if area > largest_area:
                largest_area = area
                largest_ring = points

        cx, cy = ring_centroid(largest_ring) if largest_ring else (0, 0)
        states.append(
            {
                "slug": feature["properties"]["slug"],
                "abbr": feature["properties"]["abbreviation"],
                "name": feature["properties"]["name"],
                "d": " ".join(paths),
                "cx": round(cx, 1),
                "cy": round(cy, 1),
            }
        )

    states.sort(key=lambda item: item["slug"])
    return {
        "generatedFrom": "public/data/boundaries/germany-states.geojson",
        "viewBox": {"w": target_width, "h": height},
        "states": states,
    }


def read_rows(con: duckdb.DuckDBPyConnection, query: str) -> list[dict]:
    result = con.execute(query).fetchall()
    columns = [description[0] for description in con.description]
    return [dict(zip(columns, row)) for row in result]


def metric_select(group_columns: list[str], max_commissioned: str) -> str:
    group_select = ",\n          ".join(group_columns)
    group_by = ", ".join(group_columns)
    select_prefix = f"{group_select},\n          " if group_select else ""
    group_clause = f"group by {group_by}" if group_by else ""

    return f"""
        select
          {select_prefix}
          count(*)::integer as charging_units,
          coalesce(sum(charging_points), 0)::integer as charging_points,
          coalesce(sum(nominal_power_kw), 0)::double as reported_nominal_kw,
          coalesce(sum(case
            when charger_type = '{FAST_CHARGER_TYPE}'
            then charging_points
            else 0
          end), 0)::integer as dc_fast_charging_points,
          coalesce(sum(case
            when charger_type <> '{FAST_CHARGER_TYPE}' or charger_type is null
            then charging_points
            else 0
          end), 0)::integer as normal_charging_points,
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
          count(distinct nullif(trim(operator), ''))::integer as operator_count,
          count(distinct district)::integer as district_count,
          count(distinct city)::integer as city_count,
          coalesce(sum(case when opening_hours = '247' then 1 else 0 end), 0)::integer as open_247_units,
          coalesce(sum(case
            when parking_info ilike '%keine beschr%' then 1
            else 0
          end), 0)::integer as unrestricted_parking_units,
          coalesce(sum(case
            when parking_info ilike '%kunden%' or parking_info ilike '%besucher%'
            then 1
            else 0
          end), 0)::integer as limited_parking_units,
          coalesce(sum(case when parking_info is null or trim(parking_info) = '' then 1 else 0 end), 0)::integer as unknown_parking_units,
          coalesce(sum(case when contains(coalesce(payment_systems, ''), 'Onlinezahlungsverfahren') then 1 else 0 end), 0)::integer as app_payment_units,
          coalesce(sum(case when contains(coalesce(payment_systems, ''), 'RFID') then 1 else 0 end), 0)::integer as rfid_payment_units,
          coalesce(sum(case when contains(coalesce(payment_systems, ''), 'Kreditkarte') then 1 else 0 end), 0)::integer as credit_card_payment_units,
          coalesce(sum(case when contains(coalesce(payment_systems, ''), 'Debitkarte') then 1 else 0 end), 0)::integer as debit_card_payment_units,
          coalesce(sum(case when contains(coalesce(payment_systems, ''), 'Plug & Charge') then 1 else 0 end), 0)::integer as plug_charge_payment_units,
          coalesce(sum(case when contains(coalesce(payment_systems, ''), 'Kostenlos') then 1 else 0 end), 0)::integer as free_payment_units,
          coalesce(sum(case when coalesce(has_ccs, false) then 1 else 0 end), 0)::integer as ccs_units,
          coalesce(sum(case when coalesce(has_type2, false) then 1 else 0 end), 0)::integer as type2_units,
          coalesce(sum(case when coalesce(has_tesla, false) then 1 else 0 end), 0)::integer as tesla_units,
          coalesce(sum(case when coalesce(has_chademo, false) then 1 else 0 end), 0)::integer as chademo_units,
          coalesce(sum(case when coalesce(has_schuko, false) then 1 else 0 end), 0)::integer as schuko_units,
          coalesce(sum(case when coalesce(has_cee, false) then 1 else 0 end), 0)::integer as cee_units,
          coalesce(sum(case when coalesce(has_mcs, false) then 1 else 0 end), 0)::integer as mcs_units,
          coalesce(sum(case
            when commissioned_at >= date '{max_commissioned}' - interval 12 month
            then 1
            else 0
          end), 0)::integer as added_last_12mo_units,
          coalesce(sum(case
            when commissioned_at >= date '{max_commissioned}' - interval 12 month
            then charging_points
            else 0
          end), 0)::integer as added_last_12mo_charging_points,
          coalesce(sum(case
            when commissioned_at >= date '{max_commissioned}' - interval 12 month
            then nominal_power_kw
            else 0
          end), 0)::double as added_last_12mo_reported_nominal_kw,
          bool_or(coalesce(has_ccs, false)) as has_ccs,
          bool_or(coalesce(has_type2, false)) as has_type2,
          bool_or(coalesce(has_tesla, false)) as has_tesla,
          bool_or(coalesce(has_chademo, false)) as has_chademo,
          bool_or(coalesce(has_schuko, false)) as has_schuko,
          bool_or(coalesce(has_cee, false)) as has_cee,
          bool_or(coalesce(has_mcs, false)) as has_mcs,
          min(commissioned_at) as first_live_date,
          max(commissioned_at) as newest_date
        from read_parquet('{SOURCE.as_posix()}')
        {group_clause}
    """


def rank_records(records: list[dict]) -> None:
    records.sort(
        key=lambda item: (
            -item["reportedNominalKw"],
            -item["chargingUnits"],
            item["name"],
        )
    )
    for rank, record in enumerate(records, start=1):
        record["rank"] = rank


def base_record(
    row: dict,
    *,
    region_type: str,
    name: str,
    region_id: str,
    slug: str,
    parent: dict | None = None,
) -> dict:
    charging_units = row["charging_units"]
    charging_points = row["charging_points"]
    reported_nominal_kw = row["reported_nominal_kw"]
    dc_fast_points = row["dc_fast_charging_points"]

    record = {
        "id": region_id,
        "type": region_type,
        "name": name,
        "slug": slug,
        "chargingUnits": charging_units,
        "chargingPoints": charging_points,
        "reportedNominalKw": round(reported_nominal_kw, 1),
        "dcFastChargingPoints": dc_fast_points,
        "dcFastPct": pct(dc_fast_points, charging_points),
        "normalChargingPoints": row["normal_charging_points"],
        "normalPct": pct(row["normal_charging_points"], charging_points),
        "avgKwPerPoint": round(reported_nominal_kw / charging_points) if charging_points else 0,
        "peakKw": round(row["peak_kw"]),
        "plugSlotsPerUnit": round(row["plug_slots"] / charging_units, 1) if charging_units else 0,
        "powerClass150PlusPct": pct(row["power_150_plus_points"], charging_points),
        "powerClass50To149Pct": pct(row["power_50_149_points"], charging_points),
        "powerClassLowPct": pct(row["power_low_points"], charging_points),
        "operatorCount": row["operator_count"],
        "districtCount": row["district_count"],
        "cityCount": row["city_count"],
        "open247Pct": pct(row["open_247_units"], charging_units),
        "parking": {
            "unrestrictedPct": pct(row["unrestricted_parking_units"], charging_units),
            "limitedPct": pct(row["limited_parking_units"], charging_units),
            "unknownPct": pct(row["unknown_parking_units"], charging_units),
        },
        "payment": {
            "appPct": pct(row["app_payment_units"], charging_units),
            "rfidPct": pct(row["rfid_payment_units"], charging_units),
            "creditCardPct": pct(row["credit_card_payment_units"], charging_units),
            "debitCardPct": pct(row["debit_card_payment_units"], charging_units),
            "plugChargePct": pct(row["plug_charge_payment_units"], charging_units),
            "freePct": pct(row["free_payment_units"], charging_units),
        },
        "connectors": {
            "ccs": bool(row["has_ccs"]),
            "type2": bool(row["has_type2"]),
            "tesla": bool(row["has_tesla"]),
            "chademo": bool(row["has_chademo"]),
            "schuko": bool(row["has_schuko"]),
            "cee": bool(row["has_cee"]),
            "mcs": bool(row["has_mcs"]),
        },
        "connectorUnitPct": {
            "ccs": pct(row["ccs_units"], charging_units),
            "type2": pct(row["type2_units"], charging_units),
            "tesla": pct(row["tesla_units"], charging_units),
            "chademo": pct(row["chademo_units"], charging_units),
            "schuko": pct(row["schuko_units"], charging_units),
            "cee": pct(row["cee_units"], charging_units),
            "mcs": pct(row["mcs_units"], charging_units),
        },
        "addedLast12Mo": {
            "chargingUnits": row["added_last_12mo_units"],
            "chargingPoints": row["added_last_12mo_charging_points"],
            "reportedNominalKw": round(row["added_last_12mo_reported_nominal_kw"], 1),
        },
        "firstLiveDate": row["first_live_date"],
        "newestDate": row["newest_date"],
    }

    if parent:
        record["parent"] = parent

    return record


def top_operator_groups(con: duckdb.DuckDBPyConnection, group_columns: list[str]) -> dict[tuple, list[dict]]:
    group_select = ", ".join(group_columns)
    group_by = ", ".join([*group_columns, "operator"])
    order_by = ", ".join([*group_columns, "reported_nominal_kw desc", "charging_units desc", "operator asc"])
    rows = read_rows(
        con,
        f"""
        select
          {group_select},
          operator,
          count(*)::integer as charging_units,
          coalesce(sum(charging_points), 0)::integer as charging_points,
          coalesce(sum(nominal_power_kw), 0)::double as reported_nominal_kw
        from read_parquet('{SOURCE.as_posix()}')
        where operator is not null
          and trim(operator) <> ''
        group by {group_by}
        order by {order_by}
        """,
    )

    grouped = defaultdict(list)
    for row in rows:
        key = tuple(row[column] for column in group_columns)
        if len(grouped[key]) < TOP_OPERATOR_LIMIT:
            grouped[key].append(
                {
                    "operator": row["operator"],
                    "chargingUnits": row["charging_units"],
                    "chargingPoints": row["charging_points"],
                    "reportedNominalKw": round(row["reported_nominal_kw"], 1),
                }
            )

    return grouped


def add_top_operator_shares(record: dict) -> None:
    total_kw = record["reportedNominalKw"]
    total_units = record["chargingUnits"]
    total_points = record["chargingPoints"]
    top_operators = record.get("topOperators", [])

    for operator in top_operators:
        operator["reportedNominalKwPct"] = pct(operator["reportedNominalKw"], total_kw)
        operator["chargingUnitsPct"] = pct(operator["chargingUnits"], total_units)
        operator["chargingPointsPct"] = pct(operator["chargingPoints"], total_points)

    top_operator = top_operators[0] if top_operators else None
    record["topOperatorReportedNominalKwPct"] = (
        pct(top_operator["reportedNominalKw"], total_kw) if top_operator else 0
    )
    record["top5ReportedNominalKwPct"] = pct(
        sum(operator["reportedNominalKw"] for operator in top_operators),
        total_kw,
    )


def rollout_groups(con: duckdb.DuckDBPyConnection, group_columns: list[str]) -> dict[tuple, list[dict]]:
    group_select = ", ".join(group_columns)
    group_by = ", ".join([*group_columns, "commissioned_year"])
    order_by = ", ".join([*group_columns, "commissioned_year asc"])
    rows = read_rows(
        con,
        f"""
        select
          {group_select},
          extract(year from commissioned_at)::integer as commissioned_year,
          count(*)::integer as units,
          coalesce(sum(charging_points), 0)::integer as charging_points,
          coalesce(sum(nominal_power_kw), 0)::double as reported_nominal_kw
        from read_parquet('{SOURCE.as_posix()}')
        where commissioned_at is not null
        group by {group_by}
        order by {order_by}
        """,
    )

    grouped = defaultdict(list)
    cumulative_by_group = defaultdict(lambda: {"units": 0, "points": 0, "kw": 0.0})

    for row in rows:
        key = tuple(row[column] for column in group_columns)
        cumulative = cumulative_by_group[key]
        cumulative["units"] += row["units"]
        cumulative["points"] += row["charging_points"]
        cumulative["kw"] += row["reported_nominal_kw"]
        grouped[key].append(
            {
                "year": row["commissioned_year"],
                "addedUnits": row["units"],
                "cumulativeUnits": cumulative["units"],
                "cumulativeChargingPoints": cumulative["points"],
                "cumulativeReportedNominalKw": round(cumulative["kw"], 1),
            }
        )

    return grouped


def child_groups(
    records: list[dict],
    parent_key: str,
    *,
    limit: int | None = None,
) -> dict[str, list[dict]]:
    grouped = defaultdict(list)
    for record in records:
        grouped[record["parent"][parent_key]].append(record)

    for values in grouped.values():
        rank_records(values)
        if limit is not None:
            del values[limit:]

    return grouped


def strip_for_child_list(record: dict) -> dict:
    return {
        "id": record["id"],
        "name": record["name"],
        "slug": record["slug"],
        "rank": record["rank"],
        "chargingUnits": record["chargingUnits"],
        "chargingPoints": record["chargingPoints"],
        "reportedNominalKw": record["reportedNominalKw"],
        "dcFastPct": record["dcFastPct"],
        "operatorCount": record["operatorCount"],
    }


def main() -> None:
    state_svg_paths = build_state_svg_paths()
    existing_state_svg_paths = None
    existing_state_svg_path = TARGET_DIR / "germany-states-paths.json"
    if state_svg_paths is None and existing_state_svg_path.exists():
        existing_state_svg_paths = json.loads(
            existing_state_svg_path.read_text(encoding="utf-8")
        )

    if TARGET_DIR.exists():
        resolved_target = TARGET_DIR.resolve()
        resolved_public_data = (ROOT / "public" / "data").resolve()
        if resolved_public_data not in resolved_target.parents:
            raise RuntimeError(f"Refusing to delete unexpected path: {TARGET_DIR}")
        shutil.rmtree(TARGET_DIR)

    con = duckdb.connect()
    max_commissioned = con.execute(
        f"select max(commissioned_at) from read_parquet('{SOURCE.as_posix()}')"
    ).fetchone()[0]
    distinct_city_names = con.execute(
        f"""
        select count(distinct city)::integer
        from read_parquet('{SOURCE.as_posix()}')
        where city is not null and trim(city) <> ''
        """
    ).fetchone()[0]

    max_commissioned_text = str(max_commissioned)
    national_row = read_rows(con, metric_select([], max_commissioned_text))[0]
    state_rows = read_rows(con, metric_select(["state"], max_commissioned_text))
    district_rows = read_rows(con, metric_select(["state", "district"], max_commissioned_text))
    city_rows = read_rows(con, metric_select(["state", "district", "city"], max_commissioned_text))
    state_slugs = unique_slug_lookup(state_rows, parent_columns=[], name_column="state")
    district_slugs = unique_slug_lookup(
        district_rows,
        parent_columns=["state"],
        name_column="district",
    )
    city_slugs = unique_slug_lookup(
        city_rows,
        parent_columns=["state", "district"],
        name_column="city",
    )

    state_top_operators = top_operator_groups(con, ["state"])
    district_top_operators = top_operator_groups(con, ["state", "district"])
    city_top_operators = top_operator_groups(con, ["state", "district", "city"])

    state_rollouts = rollout_groups(con, ["state"])
    district_rollouts = rollout_groups(con, ["state", "district"])
    city_rollouts = rollout_groups(con, ["state", "district", "city"])

    states = []
    state_by_name = {}
    for row in state_rows:
        state_name = row["state"]
        state_slug = state_slugs[(state_name,)]
        state = base_record(
            row,
            region_type="state",
            name=state_name,
            region_id=f"state:{state_slug}",
            slug=state_slug,
        )
        state["topOperators"] = state_top_operators[(state_name,)]
        add_top_operator_shares(state)
        state["rolloutByYear"] = state_rollouts[(state_name,)]
        state["districtsFile"] = f"data/regions/districts/by-state/{state_slug}.json"
        states.append(state)
        state_by_name[state_name] = state

    districts = []
    district_by_key = {}
    for row in district_rows:
        state_name = row["state"]
        district_name = row["district"]
        state = state_by_name[state_name]
        district_slug = district_slugs[(state_name, district_name)]
        district = base_record(
            row,
            region_type="district",
            name=district_name,
            region_id=f"district:{state['slug']}/{district_slug}",
            slug=district_slug,
            parent={"state": state_name, "stateSlug": state["slug"]},
        )
        district["topOperators"] = district_top_operators[(state_name, district_name)]
        add_top_operator_shares(district)
        district["rolloutByYear"] = district_rollouts[(state_name, district_name)]
        district["citiesFile"] = (
            f"data/regions/cities/by-district/{state['slug']}/{district_slug}.json"
        )
        districts.append(district)
        district_by_key[(state_name, district_name)] = district

    cities = []
    for row in city_rows:
        state_name = row["state"]
        district_name = row["district"]
        city_name = row["city"]
        state = state_by_name[state_name]
        district = district_by_key[(state_name, district_name)]
        city_slug = city_slugs[(state_name, district_name, city_name)]
        city = base_record(
            row,
            region_type="city",
            name=city_name,
            region_id=f"city:{state['slug']}/{district['slug']}/{city_slug}",
            slug=city_slug,
            parent={
                "state": state_name,
                "stateSlug": state["slug"],
                "district": district_name,
                "districtSlug": district["slug"],
            },
        )
        city["topOperators"] = city_top_operators[(state_name, district_name, city_name)]
        add_top_operator_shares(city)
        city["rolloutByYear"] = city_rollouts[(state_name, district_name, city_name)]
        cities.append(city)

    rank_records(states)
    districts_by_state = child_groups(districts, "stateSlug")
    cities_by_state = defaultdict(list)
    cities_by_district = defaultdict(list)
    for city in cities:
        cities_by_state[city["parent"]["stateSlug"]].append(city)
        cities_by_district[(city["parent"]["stateSlug"], city["parent"]["districtSlug"])].append(city)

    for grouped_cities in cities_by_district.values():
        rank_records(grouped_cities)

    top_districts_by_state = child_groups([dict(record) for record in districts], "stateSlug", limit=5)
    top_cities_by_state = child_groups([dict(record) for record in cities], "stateSlug", limit=5)
    top_cities_by_district = {}
    for key, grouped_cities in cities_by_district.items():
        top_cities_by_district[key] = [strip_for_child_list(city) for city in grouped_cities[:5]]

    for state in states:
        state_slug = state["slug"]
        state["districtCount"] = len(districts_by_state[state_slug])
        state["cityCount"] = len(cities_by_state[state_slug])
        state["topDistricts"] = [
            strip_for_child_list(district)
            for district in top_districts_by_state[state_slug]
        ]
        state["topCities"] = [
            strip_for_child_list(city)
            for city in top_cities_by_state[state_slug]
        ]

    for district in districts:
        key = (district["parent"]["stateSlug"], district["slug"])
        district["cityCount"] = len(cities_by_district[key])
        district["topCities"] = top_cities_by_district[key]

    national = base_record(
        national_row,
        region_type="national",
        name="Deutschland",
        region_id="national:deutschland",
        slug="deutschland",
    )
    national["stateCount"] = len(states)
    national["districtCount"] = len(districts)
    national["cityCount"] = len(cities)
    national["distinctCityNames"] = distinct_city_names

    common_meta = {
        "generatedFrom": "public/data/chargers.clean.parquet",
        "generatedThrough": str(max_commissioned),
    }

    write_json(
        TARGET_DIR / "index.json",
        {
            **common_meta,
            "sourceRows": national["chargingUnits"],
            "grains": {
                "states": len(states),
                "districts": len(districts),
                "cities": len(cities),
                "distinctCityNames": distinct_city_names,
            },
            "national": national,
            "files": {
                "states": "data/regions/states.json",
                "districtsByState": "data/regions/districts/by-state/{stateSlug}.json",
                "citiesByDistrict": "data/regions/cities/by-district/{stateSlug}/{districtSlug}.json",
            },
            "metricNotes": {
                "chargingUnits": "Count of BNetzA Ladeeinrichtung records, not unique physical sites.",
                "chargingPoints": "Sum of registered Ladepunkte.",
                "reportedNominalKw": "Sum of source-reported nominal power; not utilization or installed grid capacity.",
                "dcFastPct": f"Share of charging points whose row has charger_type = '{FAST_CHARGER_TYPE}'.",
                "normalPct": f"Share of charging points whose row does not have charger_type = '{FAST_CHARGER_TYPE}'.",
                "powerClassPct": "Charging-point shares grouped by max_plug_power_kw: 150+, 50-149, and lower or missing.",
                "connectorUnitPct": "Share of charging units listing each connector type; connector categories overlap.",
                "paymentPct": "Share of charging units listing each payment option; payment categories overlap.",
                "topOperatorPct": "Operator concentration shares are based on reportedNominalKw unless the field name says otherwise.",
                "addedLast12Mo": "Rows commissioned during the 12 months before generatedThrough.",
                "cities": "City grain is state + district + city; distinct city names are tracked separately.",
            },
        },
    )

    write_json(TARGET_DIR / "states.json", {**common_meta, "states": states})

    for state in states:
        state_districts = districts_by_state[state["slug"]]
        write_json(
            TARGET_DIR / "districts" / "by-state" / f"{state['slug']}.json",
            {
                **common_meta,
                "state": state,
                "districts": state_districts,
            },
        )

    for district in districts:
        state_slug = district["parent"]["stateSlug"]
        district_slug = district["slug"]
        write_json(
            TARGET_DIR / "cities" / "by-district" / state_slug / f"{district_slug}.json",
            {
                **common_meta,
                "district": district,
                "cities": cities_by_district[(state_slug, district_slug)],
            },
        )

    if state_svg_paths is not None:
        write_json(TARGET_DIR / "germany-states-paths.json", state_svg_paths)
    elif existing_state_svg_paths is not None:
        write_json(TARGET_DIR / "germany-states-paths.json", existing_state_svg_paths)
    else:
        raise RuntimeError(
            "Missing Germany state SVG paths. Add public/data/regions/germany-states-paths.json "
            f"or source boundaries at {STATE_BOUNDARIES}."
        )

    print(
        "Wrote regional data: "
        f"{len(states):,} states, {len(districts):,} districts, {len(cities):,} cities "
        f"to {TARGET_DIR}"
    )


if __name__ == "__main__":
    main()
