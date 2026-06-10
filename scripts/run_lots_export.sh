#!/usr/bin/env bash
# run_lots_export.sh  –  One-shot helper
# Converts a lot-inventory CSV export into ../static/data/lots.json.
# XLSX/XLS is still accepted for older local files, but CSV is preferred.
#
# Usage (from anywhere):
#     scripts/run_lots_export.sh [lots.csv]
# -----------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR%/scripts}"
PY_CMD="python3"
XLSX_REQS=(pandas openpyxl)

# -------- locate python --------
if ! command -v "$PY_CMD" &>/dev/null; then
  if command -v python &>/dev/null; then
    PY_CMD="python"
  else
    echo "❌ Python 3 not found. Install it first.";
    read -n1 -s -r -p "Press any key to exit…"; echo;
    exit 1
  fi
fi

# -------- pick inventory file --------
INPUT_PATH="${1:-}"
if [[ -z "$INPUT_PATH" ]]; then
  INPUT_PATH=$(find "$SCRIPT_DIR" -maxdepth 1 -type f -name '*.csv' | sort | head -n1 || true)
fi
if [[ -z "$INPUT_PATH" ]]; then
  INPUT_PATH=$(find "$SCRIPT_DIR" -maxdepth 1 -type f \( -name '*.xlsx' -o -name '*.xls' \) | sort | head -n1 || true)
fi

if [[ -z "$INPUT_PATH" || ! -f "$INPUT_PATH" ]]; then
  echo "❌ Lot inventory file not found. Pass it as an argument or place a .csv file in scripts/.";
  read -n1 -s -r -p "Press any key to exit…"; echo; exit 1;
fi

# -------- XLSX-only dependency check --------
case "${INPUT_PATH,,}" in
  *.xlsx|*.xls)
    if ! "$PY_CMD" -m pip --version &>/dev/null; then
      echo "ℹ️  pip missing – bootstrapping …"
      "$PY_CMD" -m ensurepip --upgrade || { echo "❌ pip install failed"; read -n1 -s -r -p "Press any key to exit…"; echo; exit 1; }
    fi

    INSTALL_FAILED=0
    for pkg in "${XLSX_REQS[@]}"; do
      if "$PY_CMD" - <<PY 2>/dev/null
import importlib.util, sys
sys.exit(0 if importlib.util.find_spec('$pkg') else 1)
PY
      then
        echo "✅ $pkg already present."
      else
        echo "➕ Installing $pkg …" &&
          "$PY_CMD" -m pip install --user "$pkg" || { echo "❌ $pkg install failed"; INSTALL_FAILED=1; }
      fi
    done

    [[ $INSTALL_FAILED -eq 0 ]] || { echo "⚠️  Some deps failed. Aborting."; read -n1 -s -r -p "Press any key to exit…"; echo; exit 1; }
    ;;
esac

echo "🎯 Dependencies OK. Converting lot inventory…"

OUTPUT_DIR="$REPO_ROOT/static/data"
mkdir -p "$OUTPUT_DIR"
OUTPUT_PATH="$OUTPUT_DIR/lots.json"

"$PY_CMD" "$SCRIPT_DIR/lots2json.py" "$INPUT_PATH" -o "$OUTPUT_PATH" && \
  echo "🚀 Exported → $OUTPUT_PATH" || echo "❌ Export failed"

read -n1 -s -r -p "Press any key to continue…"; echo
