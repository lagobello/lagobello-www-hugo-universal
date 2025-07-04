#!/usr/bin/env bash
# run_lots_export.sh  –  One-shot helper
#   1) Ensures Python + deps (pandas, numpy, openpyxl)
#   2) Converts a Monday “Lot Inventory” Excel file into ../static/data/lots.json
#
# Usage (from anywhere):
#     scripts/run_lots_export.sh [Lot_Inventory.xlsx]
# -----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR%/scripts}"
PY_CMD="python3"
REQS=(pandas numpy openpyxl)

# -------- locate python --------
if ! command -v $PY_CMD &>/dev/null; then
  if command -v python &>/dev/null; then
    PY_CMD="python"
  else
    echo "❌ Python 3 not found. Install it first.";
    read -n1 -s -r -p "Press any key to exit…"; echo;
    exit 1
  fi
fi

# -------- ensure pip --------
if ! $PY_CMD -m pip --version &>/dev/null; then
  echo "ℹ️  pip missing – bootstrapping …"
  $PY_CMD -m ensurepip --upgrade || { echo "❌ pip install failed"; read -n1 -s -r -p "Press any key to exit…"; echo; exit 1; }
fi

# -------- install deps --------
INSTALL_FAILED=0
for pkg in "${REQS[@]}"; do
  if $PY_CMD - <<PY 2>/dev/null
import importlib.util, sys
sys.exit(0 if importlib.util.find_spec('$pkg') else 1)
PY
  then
    echo "✅ $pkg already present."
  else
    echo "➕ Installing $pkg …" &&
      $PY_CMD -m pip install --user "$pkg" || { echo "❌ $pkg install failed"; INSTALL_FAILED=1; }
  fi
done

[[ $INSTALL_FAILED -eq 0 ]] || { echo "⚠️  Some deps failed. Aborting."; read -n1 -s -r -p "Press any key to exit…"; echo; exit 1; }

echo "🎯 Dependencies OK. Converting Excel…"

# -------- pick excel file --------
EXCEL_PATH="${1:-}"
if [[ -z "$EXCEL_PATH" ]]; then
  EXCEL_PATH=$(ls "$SCRIPT_DIR"/*.xlsx 2>/dev/null | head -n1 || true)
fi

if [[ -z "$EXCEL_PATH" || ! -f "$EXCEL_PATH" ]]; then
  echo "❌ Excel file not found. Pass it as an argument or place it in scripts/.";
  read -n1 -s -r -p "Press any key to exit…"; echo; exit 1;
fi

OUTPUT_DIR="$REPO_ROOT/static/data"
mkdir -p "$OUTPUT_DIR"
OUTPUT_PATH="$OUTPUT_DIR/lots.json"

$PY_CMD "$SCRIPT_DIR/xlsx2json.py" "$EXCEL_PATH" -o "$OUTPUT_PATH" && \
  echo "🚀 Exported → $OUTPUT_PATH" || echo "❌ Export failed"

read -n1 -s -r -p "Press any key to continue…"; echo