# herdr-auto-update — agent instructions

## Always restart the local install after code changes

This plugin runs as a persistent background process declared via `[[startup]]` in
`herdr-plugin.toml` (`node bin/watch.js`). That process is spawned once, when herdr's own
server starts — **not** on `herdr plugin enable`/`disable`. Confirmed empirically against a
sibling plugin (herdr 0.8.2, same startup mechanism): `herdr plugin disable`/`enable` reports
success but does not kill or respawn the running startup process. Code changes sit inert in an
already-running process until it's actually restarted.

Whenever you finish a change to this plugin's code (anything the running process loads —
`lib/*.js`, `bin/watch.js`), restart it yourself as the last step, without being asked:

```bash
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"   # or hardcode the repo path
CONFIG_DIR="$(herdr plugin config-dir barnuri.auto-update)"
# Match on the absolute script path, not just "bin/watch.js" — a sibling
# plugin (herdr-telegram-notifications) runs the exact same relative
# command, and a process launched with a relative path won't show a
# matchable path at all.
pkill -f "node $PLUGIN_DIR/bin/watch\.js" 2>/dev/null
sleep 1  # the process traps SIGTERM and exits at its next poll tick, not instantly
HERDR_PLUGIN_CONFIG_DIR="$CONFIG_DIR" nohup node "$PLUGIN_DIR/bin/watch.js" >> "$CONFIG_DIR/watch.log" 2>&1 &
disown
```

No restart needed for one-shot action scripts (e.g. `check-now`'s command) or test/doc-only
changes — those run fresh on every invocation.
