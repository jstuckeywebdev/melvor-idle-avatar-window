/** Visibility persistence only (panel is in-page UI; no float position/size). */

const VISIBLE_KEY = 'panelVisible';

function localKey(suffix) {
  const name =
    (typeof game !== 'undefined' && (game.characterName || game.activeCharacter?.name)) ||
    'unknown';
  return `avatarWindow:${name}:${suffix}`;
}

function safeCharacterSet(ctx, key, value) {
  try {
    ctx.characterStorage.setItem(key, value);
  } catch (err) {
    console.warn('[Avatar Window] characterStorage set failed, using localStorage', err);
  }
  try {
    localStorage.setItem(localKey(key), JSON.stringify(value));
  } catch (_) {
    /* ignore */
  }
}

function safeCharacterGet(ctx, key) {
  try {
    const fromMod = ctx.characterStorage.getItem(key);
    if (fromMod != null) return fromMod;
  } catch (_) {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(localKey(key));
    if (raw != null) return JSON.parse(raw);
  } catch (_) {
    /* ignore */
  }
  return null;
}

export function loadPanelVisible(ctx) {
  const saved = safeCharacterGet(ctx, VISIBLE_KEY);
  return saved == null ? true : Boolean(saved);
}

export function savePanelVisible(ctx, visible) {
  safeCharacterSet(ctx, VISIBLE_KEY, visible);
}
