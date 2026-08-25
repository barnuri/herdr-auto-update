#!/usr/bin/env bash
# Idempotent supervisor for bin/watch.js.
#
# herdr only spawns [[startup]] processes when its server boots, and never
# restarts one that dies. This script is wired to [[events]] hooks so a dead
# watcher heals on the next UI interaction. It runs on every pane focus, so it
# stays silent and does the cheapest possible liveness check.
set -uo pipefail

# shellcheck source=./plugin-env.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/plugin-env.sh"

WATCH_JS="$PLUGIN_DIR/bin/watch.js"
STALE_LOCK_MINUTES=1

PID_FILE="$CONFIG_DIR/watch.pid"
LOCK_DIR="$CONFIG_DIR/ensure.lock"
WATCH_LOG="$CONFIG_DIR/watch.log"

is_watch_alive() {
  [ -f "$PID_FILE" ] || return 1
  local pid
  pid="$(cat "$PID_FILE" 2>/dev/null)" || return 1
  case "$pid" in
    '' | *[!0-9]*) return 1 ;;
  esac
  kill -0 "$pid" 2>/dev/null || return 1
  # PIDs are recycled, and herdr-telegram-notifications runs a bin/watch.js of
  # its own — only an exact match on this plugin's absolute path counts as alive
  ps -p "$pid" -o command= 2>/dev/null | grep -qF "$WATCH_JS"
}

is_watch_alive && exit 0

command -v node >/dev/null 2>&1 || exit 0

mkdir -p "$CONFIG_DIR" 2>/dev/null || exit 0

# a lock left behind by a killed run would block healing forever
if [ -d "$LOCK_DIR" ] && [ -n "$(find "$LOCK_DIR" -maxdepth 0 -mmin "+$STALE_LOCK_MINUTES" 2>/dev/null)" ]; then
  rmdir "$LOCK_DIR" 2>/dev/null
fi

# mkdir is atomic, so concurrent pane.focused hooks cannot both win the spawn
mkdir "$LOCK_DIR" 2>/dev/null || exit 0
trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT

# another hook may have started the watcher between our first check and the lock
is_watch_alive && exit 0

HERDR_PLUGIN_CONFIG_DIR="$CONFIG_DIR" nohup node "$WATCH_JS" >>"$WATCH_LOG" 2>&1 &
disown 2>/dev/null || true
