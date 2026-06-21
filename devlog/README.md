# Devlog

Agent-friendly visual history for the EV Mobility Dashboard.

Use this folder to keep every meaningful UI checkpoint easy to inspect without
mentally reconstructing the app from Git diffs.

## Convention

- Add one stage note in `stages/` for each meaningful UI checkpoint.
- Save at least one screenshot in `screenshots/`.
- Link any relevant design reference, mockup, or concept image.
- Keep notes short: what changed, what passed, what still feels open.
- Commit the code, screenshot, and stage note together when practical.

## Snapshot Command

Use this for UI checkpoints:

```bash
npm run snapshot -- --name short-slug --summary "What changed."
```

The script starts Vite if needed, captures the current app at `1920x1080`, saves
the screenshot, creates a stage note, and appends it to `index.md`.

## Why

Git tracks code well. This folder tracks what the product looked like and why we
accepted that direction.
