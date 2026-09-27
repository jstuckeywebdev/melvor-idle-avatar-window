# Avatar Window (Melvor Idle Mod)

In-world avatar panel embedded in Melvor’s main UI.

## Install (browser)

1. Creator Toolkit → Local Mods
2. Add / update modfile: `avatar-window.zip` from this folder
3. Enable, hard-reload, load a character
4. Sidebar → **Avatar** to toggle the panel

## Dev notes

- Uses `ctx.loadModule` (no relative `import`)
- Hooks: `game.activeAction`, `combat.isActive`, `NotificationsManager.addNotification`
- Skill art: `assets/<skill>-char-0..5.png` on a matching `assets/env-*.png` (200×176 frames)
- Floating / pop-out window deferred
