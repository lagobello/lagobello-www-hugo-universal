#!/usr/bin/env python3
"""
lots2json.py – Convert a lot-inventory CSV/XLSX export into website `lots.json`.

Usage:
    python scripts/lots2json.py scripts/lots.csv -o static/data/lots.json
    python scripts/lots2json.py scripts/Lot_Inventory.xlsx -o static/data/lots.json

The website expects stable public-facing keys such as `Name`, `Lot Status`,
`List Price`, `Size [sqft]`, `Listing Agent`, `Listing Link`, and `Location`.
CSV is supported with the Python standard library; XLSX support is retained for
older local exports and requires pandas/openpyxl.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

# Public-facing columns the website consumes, in the desired JSON order.
PUBLIC_COLUMNS = [
    "Name",
    "Close-to",
    "Subdivision",
    "Block Number",
    "Lot Number",
    "Lot Status",
    "List Price",
    "Size [sqft]",
    "Listing Agent",
    "Listing Agent Phone Number",
    "Listing Firm",
    "Listing Link",
    "Location",
]

# Internal/deal/CRM metadata columns that should not ship to the static site.
DROP_COLS = {
    "id",
    "created at",
    "created by",
    "updated at",
    "updated by",
    "deleted at",
    "position",
    "deal value",
    "deposited",
    "remaining balance",
    "forecast revenue",
    "deals",
    "deal status",
    "buyer",
    "closing date",
    "size [acres]",
    "size acres",
}
DROP_COLS_NORMALIZED = set()

COLUMN_ALIASES = {
    "Name": ["name", "address", "lot address", "property", "property name"],
    "Close-to": ["close-to", "close to", "close_to", "closeTo", "proximity", "area"],
    "Subdivision": ["subdivision", "section", "phase"],
    "Block Number": ["block number", "block", "blockNumber", "block #", "block no"],
    "Lot Number": ["lot number", "lot", "lotNumber", "lot #", "lot no"],
    "Lot Status": ["lot status", "status", "availability", "sale status"],
    "List Price": ["list price", "listing price", "price", "asking price"],
    "Size [sqft]": ["size [sqft]", "size sqft", "size sq ft", "sqft", "sq ft", "square feet", "lot size"],
    "Listing Agent": ["listing agent", "listing agent text", "listingAgentText", "agent", "realtor", "broker", "salesperson"],
    "Listing Agent Phone Number": [
        "listing agent phone number",
        "listing agent phone number text",
        "listingAgentPhoneNumberText",
        "listing agent phone",
        "listing agent phone text",
        "listingAgentPhoneText",
        "agent phone",
        "phone",
        "phone number",
        "listing phone",
    ],
    "Listing Firm": ["listing firm", "listing firm text", "listingFirmText", "firm", "brokerage", "company", "agency"],
    "Listing Link": ["listing link", "listing link text", "listingLinkText", "link", "url", "listing url", "property url"],
    "Location": ["location", "location text", "locationText", "coordinates", "lat long", "lat/lng", "latitude longitude"],
}

LAT_ALIASES = {"latitude", "lat"}
LON_ALIASES = {"longitude", "long", "lng", "lon"}


def normalize_column_name(value: str) -> str:
    """Normalize headers for forgiving matching across CSV/XLSX exports."""
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", str(value)).strip().lower()
    return re.sub(r"[^a-z0-9]+", "", value)


# Now that normalize_column_name is available, initialize the normalized drop set.
DROP_COLS_NORMALIZED = {normalize_column_name(col) for col in DROP_COLS}


def normalized_aliases() -> dict[str, str]:
    aliases: dict[str, str] = {}
    for public_name, values in COLUMN_ALIASES.items():
        aliases[normalize_column_name(public_name)] = public_name
        for value in values:
            aliases[normalize_column_name(value)] = public_name
    return aliases


def read_inventory(path: Path) -> tuple[list[str], list[dict[str, Any]]]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        with path.open(newline="", encoding="utf-8-sig") as fp:
            sample = fp.read(4096)
            fp.seek(0)
            try:
                dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|") if sample else csv.excel
            except csv.Error:
                dialect = csv.excel
            reader = csv.DictReader(fp, dialect=dialect, restkey="__extra_columns__")
            if not reader.fieldnames:
                raise ValueError(f"CSV has no header row: {path}")
            fieldnames = [str(field).strip() for field in reader.fieldnames if field is not None]
            rows: list[dict[str, Any]] = []
            for row in reader:
                cleaned = {str(key).strip(): value for key, value in row.items() if key is not None}
                rows.append(cleaned)
            return fieldnames, rows

    if suffix in {".xlsx", ".xls"}:
        try:
            import pandas as pd  # type: ignore
        except ModuleNotFoundError as exc:
            raise SystemExit("XLSX input requires pandas and openpyxl. CSV input does not require them.") from exc

        # Older spreadsheet exports used two title rows before the actual headers.
        df = pd.read_excel(path, header=2)
        return [str(col) for col in df.columns], df.to_dict(orient="records")

    raise ValueError(f"Unsupported input file type: {path.suffix}. Use .csv, .xlsx, or .xls")


def is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    if isinstance(value, str) and not value.strip():
        return True
    return False


def coerce_public_value(key: str, value: Any) -> Any:
    if is_missing(value):
        return None
    if isinstance(value, str):
        value = value.strip()

    if key in {"List Price", "Size [sqft]", "Block Number", "Lot Number"}:
        if isinstance(value, (int, float)):
            number = float(value)
            return int(number) if number.is_integer() else number
        cleaned = re.sub(r"[^0-9.-]", "", str(value))
        if not cleaned:
            return None
        number = float(cleaned)
        return int(number) if number.is_integer() else number

    # Keep phone values as digits so existing JS can format tel: links reliably.
    if key == "Listing Agent Phone Number":
        digits = re.sub(r"\D", "", str(value))
        return digits or None

    return value


def add_combined_location(fieldnames: list[str], rows: list[dict[str, Any]], column_map: dict[str, str]) -> None:
    if "Location" in column_map.values():
        return

    normalized_to_original = {normalize_column_name(col): col for col in fieldnames}
    lat_col = next((normalized_to_original.get(normalize_column_name(alias)) for alias in LAT_ALIASES if normalized_to_original.get(normalize_column_name(alias))), None)
    lon_col = next((normalized_to_original.get(normalize_column_name(alias)) for alias in LON_ALIASES if normalized_to_original.get(normalize_column_name(alias))), None)
    if not lat_col or not lon_col:
        return

    for row in rows:
        lat = row.get(lat_col)
        lon = row.get(lon_col)
        row["Location"] = None if is_missing(lat) or is_missing(lon) else f"{lat}, {lon}"

    fieldnames.append("Location")
    column_map["Location"] = "Location"


def convert(input_path: Path) -> list[dict[str, Any]]:
    """Return public website lot records from a CSV/XLSX inventory export."""
    fieldnames, rows = read_inventory(input_path)
    aliases = normalized_aliases()

    column_map: dict[str, str] = {}
    for original in fieldnames:
        normalized = normalize_column_name(original)
        public_name = aliases.get(normalized)
        if public_name and public_name not in column_map.values():
            column_map[original] = public_name

    add_combined_location(fieldnames, rows, column_map)

    if "Name" not in column_map.values():
        available = ", ".join(str(col) for col in fieldnames)
        raise ValueError(f"Could not find a lot name/address column. Available columns: {available}")

    # Build only public website fields; do not leak CRM metadata columns.
    records: list[dict[str, Any]] = []
    for row in rows:
        record: dict[str, Any] = {key: None for key in PUBLIC_COLUMNS}
        for original, public_name in column_map.items():
            if normalize_column_name(original) in DROP_COLS_NORMALIZED:
                continue
            if public_name in record:
                record[public_name] = coerce_public_value(public_name, row.get(original))

        if not record["Name"]:
            continue
        records.append(record)

    return records


def validation_report(records: list[dict[str, Any]]) -> tuple[list[str], list[str]]:
    """Return (warnings, errors) for the public lot JSON projection."""
    warnings: list[str] = []
    errors: list[str] = []

    if not records:
        errors.append("No lot records were produced. Check that the export has a Name/address column.")
        return warnings, errors

    status_counts = Counter(str(record.get("Lot Status") or "Missing").strip() or "Missing" for record in records)
    warnings.append(
        "Status counts: " + ", ".join(f"{status}={count}" for status, count in sorted(status_counts.items()))
    )

    seen_names: Counter[str] = Counter(str(record.get("Name") or "").strip() for record in records)
    duplicate_names = sorted(name for name, count in seen_names.items() if name and count > 1)
    if duplicate_names:
        warnings.append("Duplicate lot names/addresses: " + ", ".join(duplicate_names[:12]))

    active_statuses = {"available", "listed"}
    active_records = [
        record for record in records if str(record.get("Lot Status") or "").strip().lower() in active_statuses
    ]
    active_required = ["List Price", "Size [sqft]", "Location"]
    for field in active_required:
        missing = [str(record.get("Name")) for record in active_records if is_missing(record.get(field))]
        if missing:
            warnings.append(f"Active lots missing {field}: " + ", ".join(missing[:12]))

    for record in records:
        url = record.get("Listing Link")
        if url and not re.match(r"^https?://", str(url), re.IGNORECASE):
            warnings.append(f"Listing Link is not http(s) for {record.get('Name')}: {url}")

        phone = record.get("Listing Agent Phone Number")
        if phone and len(str(phone)) not in {10, 11}:
            warnings.append(f"Unexpected listing-agent phone length for {record.get('Name')}: {phone}")

    return warnings, errors


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert a lot-inventory CSV/XLSX export to website lots.json",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument("input", type=Path, help="Path to the lot inventory export (.csv, .xlsx, or .xls)")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("static/data/lots.json"),
        help="Output JSON path (default: static/data/lots.json)",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit non-zero if validation finds warnings as well as hard errors.",
    )
    args = parser.parse_args()

    records = convert(args.input)
    warnings, errors = validation_report(records)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w", encoding="utf-8", newline="\n") as fp:
            json.dump(records, fp, indent=2)
        print(f"Wrote {len(records)} lot records -> {args.output}")
    else:
        json.dump(records, sys.stdout, indent=2)
        print()

    for warning in warnings:
        print(f"WARNING: {warning}", file=sys.stderr)
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    if errors or (args.strict and warnings):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
