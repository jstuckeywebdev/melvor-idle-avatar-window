# Avatar Window (Melvor Idle Mod)

OSRS-styled in-world avatar panel embedded in Melvor’s main UI.

## Features

- In-page Melvor `block` at the top of the main content (sidebar toggles show/hide)
- Fixed character look with transparent sprite compositing
- Skill loops for every non-combat skill (same character, outfit changes with the skill)
- Mining: static rock layer + character-only frame animation (rock never scales)
- Activity environments, gain feed, combat HP

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
