#!/usr/bin/env python3
"""
xlsx2json.py – Convert a Monday **Lot Inventory** Excel export into a clean `lots.json` for the website.

Usage
-----
    python scripts/xlsx2json.py path/to/Lot_Inventory.xlsx -o data/lots.json

If you omit `-o`, the JSON is written to stdout so you can pipe or inspect it.

What it does
------------
* Reads the sheet (headers on row 3 in the Monday export).
* Drops deal-related columns and the acres column.
* Keeps everything else – including listing‑agent phone, price, status, link & image.
* Converts `NaN` → `null` for JSON‑friendliness.

Dependencies: `pandas`, `numpy`, and the Excel engine `openpyxl`.
Install once with:
    pip install pandas numpy openpyxl
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd
import numpy as np

# Columns we do **not** want in the JSON output
DROP_COLS = {
    "Deal Value",
    "Deposited",
    "Remaining Balance",
    "Forecast Revenue",
    "Deals",
    "Deal Status",
    "Buyer",
    "Closing Date",
    "Size [acres]",
}

def convert(xlsx_path: Path) -> tuple[list[dict], list[dict]]:
    """Return a tuple of (original records, json-ld records)."""
    # Monday export uses header row index 2 (third row)
    df = pd.read_excel(xlsx_path, header=2)

    # Skip rows without a lot name
    df = df[df["Name"].notna()]

    keep_cols = [c for c in df.columns if c not in DROP_COLS]
    df = df[keep_cols]

    # Replace NaN with None so JSON encodes them as null
    df = df.replace({np.nan: None})  # type: ignore

    records = df.to_dict(orient="records")  # type: ignore

    # Convert to JSON-LD format
    json_ld_records = []
    for record in records:
        lat, lon = record["Location"].split(", ") if record["Location"] else ("", "")
        status = record["Lot Status"]
        price = record["List Price"]
        agent = record["Listing Agent"]
        size = record["Size [sqft]"] or "Unknown"

        json_ld = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": record["Name"],
            "description": f"Lot {record['Name']} in Lago Bello, {size} sqft, status: {status}",
            "url": f"https://www.lagobello.com/properties/#{record['Name']}",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Brownsville",
                "addressRegion": "TX",
                "addressCountry": "US"
            },
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": float(lat) if lat else None,
                "longitude": float(lon) if lon else None
            },
            "additionalProperty": [
                {
                    "@type": "PropertyValue",
                    "name": "Size",
                    "value": f"{size} sqft"
                },
                {
                    "@type": "PropertyValue",
                    "name": "Close To",
                    "value": record["Close-to"]
                }
            ]
        }

        # Only include offers if listed and has price
        if status in ["Listed", "Available"] and price is not None:
            availability = "https://schema.org/InStock"
            offers = {
                "@type": "Offer",
                "price": price,
                "priceCurrency": "USD",
                "availability": availability
            }
            if agent:
                offers["seller"] = {
                    "@type": "Organization",
                    "name": agent
                }
            json_ld["offers"] = offers
        elif status in ["Sold", "Under Contract", "Reserved"]:
            # For sold or under contract, perhaps no offers or OutOfStock
            pass  # omit offers

        if status in ["Listed", "Available"]:
            json_ld_records.append(json_ld)

    return records, json_ld_records

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert Monday Lot Inventory xlsx to lots.json",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument("xlsx", type=Path, help="Path to Lot_Inventory.xlsx export")
    parser.add_argument("-o", "--output", type=Path, default=Path("static/data/lots.json"), help="Output JSON path (default: static/data/lots.json)")
    parser.add_argument("--ld-output", type=Path, default=Path("data/lots-structured.json"), help="Output LD JSON path (default: data/lots-structured.json)")
    args = parser.parse_args()

    original_records, json_ld_records = convert(args.xlsx)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        # Save original
        with args.output.open("w", encoding="utf-8", newline='\n') as fp:
            json.dump(original_records, fp, indent=2)
        print(f"Wrote {len(original_records)} original records -> {args.output}")

        # Save LD version
        ld_output = args.ld_output
        ld_output.parent.mkdir(parents=True, exist_ok=True)
        with ld_output.open("w", encoding="utf-8", newline='\n') as fp:
            json.dump(json_ld_records, fp, indent=2)
        print(f"Wrote {len(json_ld_records)} LD records -> {ld_output}")
    else:
        json.dump(original_records, sys.stdout, indent=2)
        print()

if __name__ == "__main__":
    main()
