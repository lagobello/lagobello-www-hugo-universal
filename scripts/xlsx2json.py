#!/usr/bin/env python3
"""
Compatibility wrapper for the old spreadsheet converter name.

New workflow: use `scripts/lots2json.py` with a CSV export:
    python scripts/lots2json.py scripts/lots.csv -o static/data/lots.json
"""
from __future__ import annotations

from lots2json import main

if __name__ == "__main__":
    main()
