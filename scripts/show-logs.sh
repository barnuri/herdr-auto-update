#!/usr/bin/env bash
# Pane entrypoint: follow this plugin's log.
set -uo pipefail

# shellcheck source=./plugin-env.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/plugin-env.sh"

TAIL_LINES=200

mkdir -p "$(dirname "$LOG_FILE")"
# tail -F on a missing file prints a warning until it appears; create it instead
[ -f "$LOG_FILE" ] || : >"$LOG_FILE"

printf '\033[2m%s\033[0m\n' "$LOG_FILE"
exec tail -n "$TAIL_LINES" -F "$LOG_FILE"
