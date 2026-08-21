# herdr-auto-update

Keep [herdr](https://herdr.dev) always up to date. herdr ships a manual `herdr update
[--handoff]` but no built-in auto-updater — this plugin adds one: it checks the latest release
on a schedule and applies it automatically, with per-kind toggles (patch / minor / major, all
**on** by default) and live session handoff.

## How it works

- A startup hook runs a lightweight watcher for as long as herdr is running: check on start,
  then every `checkIntervalMinutes`.
- The latest version comes from the [herdrdev/herdr GitHub releases](https://github.com/herdrdev/herdr/releases)
  API (fallback: the version line on herdr.dev). The current version comes from `herdr --version`.
- If the jump is allowed by your config, it runs `herdr update --handoff` — herdr installs the
  new binary and hands the live session over, so nothing you're running dies.
- A herdr notification tells you when an update was applied (or when one was skipped because
  that kind is disabled — once per version, not on every poll).
- Zero npm dependencies; plain Node.js (>= 22).

## Install

```bash
herdr plugin install barnuri/herdr-auto-update
```

Or from a local clone: `herdr plugin link .`

The watcher starts on the next herdr restart (startup hooks run when the herdr server starts).
Run the `Check for herdr updates now` action to check immediately.

## Configuration

Everything defaults to on. `config.json` in the plugin config dir
(`herdr plugin config-dir barnuri.auto-update`) — create it in one line:

```bash
echo '{ "autoUpdateMajors": false }' > "$(herdr plugin config-dir barnuri.auto-update)/config.json"
```

All keys (every one optional):

```json
{
    "autoUpdatePatches": true,
    "autoUpdateMinors": true,
    "autoUpdateMajors": true,
    "updateWithHandoff": true,
    "checkIntervalMinutes": 360
}
```

- `autoUpdatePatches` / `autoUpdateMinors` / `autoUpdateMajors` — which semver jumps are applied
  automatically. A disabled kind still produces a one-time notification that a version is waiting.
- `updateWithHandoff` — pass `--handoff` to `herdr update` so the running session is handed over
  live (recommended; set `false` to install without handoff).
- `checkIntervalMinutes` — poll interval (minimum 15).

## Publishing note

The herdr marketplace indexes public GitHub repos carrying the `herdr-plugin` topic.

## License

MIT
