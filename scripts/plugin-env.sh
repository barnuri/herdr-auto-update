# shellcheck shell=bash
# Shared environment for this plugin's shell entrypoints. Source it, don't run it.
#
# Defines PLUGIN_DIR and CONFIG_DIR. herdr passes HERDR_PLUGIN_CONFIG_DIR to the
# processes it spawns, but an entrypoint invoked by hand may not have it, so fall
# back to asking herdr and finally to the plugin's own default.

PLUGIN_ID="barnuri.auto-update"
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

resolve_config_dir() {
  if [ -n "${HERDR_PLUGIN_CONFIG_DIR:-}" ]; then
    printf '%s' "$HERDR_PLUGIN_CONFIG_DIR"
    return 0
  fi
  local from_cli
  from_cli="$("${HERDR_BIN_PATH:-herdr}" plugin config-dir "$PLUGIN_ID" 2>/dev/null)"
  if [ -n "$from_cli" ]; then
    printf '%s' "$from_cli"
    return 0
  fi
  printf '%s' "$HOME/.config/herdr-auto-update"
}

CONFIG_DIR="$(resolve_config_dir)"
LOG_FILE="$CONFIG_DIR/logs/plugin.log"
