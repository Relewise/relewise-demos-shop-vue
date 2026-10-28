#!/bin/sh
set -eu
customer_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
skill_dir="${CODEX_HOME:-$HOME/.codex}/skills/build-customer-demo-bundle"
definitions_dir="${RELEWISE_DEFINITIONS_DIR:-${CODEX_HOME:-$HOME/.codex}/se-definitions}"
node "$skill_dir/scripts/generate-demo-behavior.mjs" "$customer_dir/workspace"
python3 "$customer_dir/scripts/tailor_bundle.py"
cd "$definitions_dir"
npm run build:customer -- --customer-workspace "$customer_dir/workspace" --output "$customer_dir/output"
