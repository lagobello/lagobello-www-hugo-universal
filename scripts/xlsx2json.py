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

def convert(xlsx_path: Path) -> list[dict]:
    """Return a list of dicts representing valid lot rows."""
    # Monday export uses header row index 2 (third row)
    df = pd.read_excel(xlsx_path, header=2)

    # Skip rows without a lot name
    df = df[df["Name"].notna()]

    keep_cols = [c for c in df.columns if c not in DROP_COLS]
    df = df[keep_cols]

    # Replace NaN with None so JSON encodes them as null
    df = df.replace({np.nan: None})

    return df.to_dict(orient="records")

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert Monday Lot Inventory xlsx to lots.json",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument("xlsx", type=Path, help="Path to Lot_Inventory.xlsx export")
    parser.add_argument("-o", "--output", type=Path, default=None, help="Output JSON path (default: stdout)")
    args = parser.parse_args()

    records = convert(args.xlsx)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w", encoding="utf-8") as fp:
            json.dump(records, fp, indent=2)
        print(f"Wrote {len(records)} records -> {args.output}")
    else:
        json.dump(records, sys.stdout, indent=2)
        print()

if __name__ == "__main__":
    main()
