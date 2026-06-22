#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.error
import urllib.request
from pathlib import Path

import pandas as pd

MOE_HTML = Path("work/moe-p1-page.html")
DIRECTORY = Path("/Users/kongtat.ong/Downloads/Primary Schools.xlsx")
GEOCODE_CACHE = Path("work/onemap-geocode-cache.json")
OUTPUT = Path("public/data/schools.sample.json")
AUDIT = Path("work/moe-p1-records.json")


PHASE_LABELS = {
    "0": "Total",
    "1": "Phase 1",
    "2A": "Phase 2A",
    "2B": "Phase 2B",
    "2C": "Phase 2C",
    "2CS": "Phase 2C Supplementary",
}


def main() -> None:
    school_records = parse_moe_records(MOE_HTML.read_text(encoding="utf-8"))
    directory = read_directory()
    cache = json.loads(GEOCODE_CACHE.read_text()) if GEOCODE_CACHE.exists() else {}
    schools = []
    unmatched_directory = []
    unmatched_moe = set(school_records)

    for _, row in directory.iterrows():
        name = str(row["school_name"]).strip()
        key = normalize_key(name)
        records = school_records.get(key)
        if not records:
            records = school_records.get(normalize_key(rename_for_moe(name)))
        if not records:
            unmatched_directory.append(name)
            continue
        unmatched_moe.discard(key)
        unmatched_moe.discard(normalize_key(rename_for_moe(name)))

        postal = str(row["postal_code"]).strip().split(".")[0].zfill(6)
        address = f"{str(row['address']).strip()}, Singapore {postal}"
        lat, lng = geocode(postal, address, cache)
        schools.append(
            {
                "id": slugify(records["schoolName"]),
                "name": records["schoolName"],
                "address": address,
                "latitude": lat,
                "longitude": lng,
                "moeSchoolFinderUrl": "https://www.moe.gov.sg/schoolfinder",
                "registrationRecords": records["registrationRecords"],
            }
        )

    schools.sort(key=lambda item: item["name"])
    OUTPUT.write_text(json.dumps(schools, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    AUDIT.write_text(json.dumps(school_records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    GEOCODE_CACHE.write_text(json.dumps(cache, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(json.dumps({
        "moeSchools": len(school_records),
        "outputSchools": len(schools),
        "unmatchedDirectory": unmatched_directory,
        "unmatchedMoe": sorted(unmatched_moe),
        "output": str(OUTPUT),
    }, indent=2, ensure_ascii=False))


def parse_moe_records(html: str) -> dict[str, dict]:
    unescaped = unescape_next_payload(html)
    school_data = extract_json_array_after(unescaped, '"schoolData":')
    records = {}
    for card in school_data:
        phase_items = card["phase_items"]
        school_name = card["school"]["school_name"]
        registration_records = []
        for wrapper in phase_items:
            item = wrapper["school_phase_item_id"]
            phase = PHASE_LABELS.get(item.get("phase"), item.get("phase") or "")
            vacancies = as_int(item.get("total_vacancies"))
            applicants = as_int(item.get("total_applicants"))
            balloting_required = item.get("balloting_required") is True
            content = (item.get("balloting_content_copy") or "").strip()
            remarks = (item.get("remarks") or "").strip()
            details = build_balloting_details(balloting_required, content, remarks, item)
            registration_records.append(
                {
                    "year": as_int(item.get("year")) or 2025,
                    "phase": phase,
                    "vacancies": vacancies,
                    "applicants": applicants,
                    "ballotingConducted": balloting_required,
                    "ballotingDetails": details,
                    "distanceCategory": extract_distance_category(content),
                }
            )
        school_display = school_name.strip()
        records[normalize_key(school_display)] = {
            "schoolName": school_display,
            "registrationRecords": sorted(apply_total_rollup(registration_records), key=phase_sort_key),
        }
    return records


def apply_total_rollup(records: list[dict]) -> list[dict]:
    total = next((record for record in records if record["phase"] == "Total"), None)
    phase_records = [record for record in records if record["phase"] != "Total"]
    if not total or not phase_records:
        return records

    applicant_sum = sum(record["applicants"] for record in phase_records)
    balloting_records = [record for record in phase_records if record["ballotingConducted"]]
    detail_lines = [
        f"{record['phase']}: {record['ballotingDetails']}"
        for record in balloting_records
        if record.get("ballotingDetails")
    ]
    distance_categories = sorted({
        record["distanceCategory"]
        for record in balloting_records
        if record.get("distanceCategory")
    })

    total["applicants"] = applicant_sum
    total["ballotingConducted"] = bool(balloting_records)
    if detail_lines:
        total["ballotingDetails"] = " | ".join(detail_lines)
    if distance_categories:
        total["distanceCategory"] = " | ".join(distance_categories)
    return records


def unescape_next_payload(html: str) -> str:
    escaped_quote_token = "__MOE_ESCAPED_QUOTE__"
    text = html.replace('\\\\\\"', escaped_quote_token)
    text = text.replace('\\"', '"').replace("\\/", "/")
    return text.replace(escaped_quote_token, '\\"')


def extract_json_array_after(text: str, marker: str) -> list[dict]:
    marker_index = text.find(marker)
    if marker_index == -1:
        raise ValueError(f"Could not find {marker}")
    start = text.find("[", marker_index)
    if start == -1:
        raise ValueError(f"Could not find array after {marker}")
    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                return json.loads(text[start:index + 1])
    raise ValueError(f"Unclosed array after {marker}")


def read_directory() -> pd.DataFrame:
    df = pd.read_excel(DIRECTORY, sheet_name="Generalinformationofschools (2)")
    df = df[df["mainlevel_code"].isin(["PRIMARY", "MIXED LEVEL (P1-S4)"])].copy()
    return df


def geocode(postal: str, address: str, cache: dict) -> tuple[float, float]:
    query = postal if postal else address
    if query in cache:
        return cache[query]["latitude"], cache[query]["longitude"]
    params = urllib.parse.urlencode({
        "searchVal": query,
        "returnGeom": "Y",
        "getAddrDetails": "Y",
        "pageNum": "1",
    })
    url = f"https://www.onemap.gov.sg/api/common/elastic/search?{params}"
    for attempt in range(6):
        try:
            with urllib.request.urlopen(url, timeout=20) as response:
                payload = json.loads(response.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == 5:
                raise
            time.sleep(2 + attempt * 2)
    else:
        raise RuntimeError(f"Could not geocode {query}")
    result = (payload.get("results") or [{}])[0]
    lat = float(result.get("LATITUDE") or result.get("latitude"))
    lng = float(result.get("LONGITUDE") or result.get("longitude"))
    cache[query] = {"latitude": lat, "longitude": lng, "raw": result}
    GEOCODE_CACHE.write_text(json.dumps(cache, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    time.sleep(0.7)
    return lat, lng


def build_balloting_details(required: bool, content: str, remarks: str, item: dict) -> str:
    if remarks:
        return remarks
    if required:
        extra = []
        if item.get("vacancies_balloted") not in ("", "0", None):
            extra.append(f"Vacancies for ballot {item['vacancies_balloted']}")
        if item.get("applicants_balloted") not in ("", "0", None):
            extra.append(f"Balloting applicants {item['applicants_balloted']}")
        suffix = f" {' '.join(extra)}" if extra else ""
        return f"Balloting: Yes {content}{suffix}".strip()
    if content:
        return content
    return "Balloting: No"


def extract_distance_category(content: str) -> str | None:
    match = re.search(r"Conducted for:\s*(.*?)(?:\.?$)", content)
    return match.group(1).strip().rstrip(".") if match else None


def phase_sort_key(record: dict) -> tuple[int, str]:
    order = {
        "Total": 0,
        "Phase 1": 1,
        "Phase 2A": 2,
        "Phase 2B": 3,
        "Phase 2C": 4,
        "Phase 2C Supplementary": 5,
    }
    return order.get(record["phase"], 99), record["phase"]


def as_int(value) -> int:
    try:
        return int(str(value).strip())
    except Exception:
        return 0


def normalize_key(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", value.upper()).strip()


def rename_for_moe(name: str) -> str:
    replacements = {
        "CATHOLIC HIGH SCHOOL": "CATHOLIC HIGH SCHOOL (PRIMARY)",
        "CHIJ ST. NICHOLAS GIRLS' SCHOOL": "CHIJ ST. NICHOLAS GIRLS' SCHOOL (PRIMARY)",
        "MARIS STELLA HIGH SCHOOL": "MARIS STELLA HIGH SCHOOL (PRIMARY)",
        "ST. ANDREW'S JUNIOR SCHOOL": "ST ANDREW'S SCHOOL (JUNIOR)",
    }
    return replacements.get(name.upper(), name)


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


if __name__ == "__main__":
    main()
