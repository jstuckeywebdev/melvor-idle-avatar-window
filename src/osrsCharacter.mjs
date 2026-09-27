/**
 * OSRS-style scenes. Each training skill is a character frame loop
 * on a matching background. The miner’s rock is a separate still layer.
 */

function frames(name, count = 6) {
  return Array.from({ length: count }, (_, i) => `assets/${name}-char-${i}.png`);
}

/** Single static idle pose. */
export const BASE_IDLE_SPRITE = 'assets/iso-idle-basic.png';

const CANVAS = { frames: 6, frameWidth: 200, frameHeight: 176 };

/** animation id -> background, frames, optional still prop */
const FRAME_SCENES = {
  mine: {
    envPath: 'assets/env-mine.png',
    framePaths: [
      'assets/mine-char-0.png',
      'assets/mine-char-1.png',
      'assets/mine-char-2.png',
      'assets/mine-char-3.png',
      'assets/mine-char-4.png',
      'assets/mine-char-5.png',
    ],
    propPath: 'assets/mine-rock.png',
    durationMs: 840,
  },
  chop: { envPath: 'assets/env-chop.png', framePaths: frames('chop'), durationMs: 960 },
  fish: { envPath: 'assets/env-fish.png', framePaths: frames('fish'), durationMs: 1100 },
  fire: { envPath: 'assets/env-cook.png', framePaths: frames('fire'), durationMs: 1000 },
  cook: { envPath: 'assets/env-kitchen.png', framePaths: frames('cook'), durationMs: 1000 },
  smith: { envPath: 'assets/env-smith.png', framePaths: frames('smith'), durationMs: 900 },
  sneak: { envPath: 'assets/env-sneak.png', framePaths: frames('sneak'), durationMs: 900 },
  fletch: { envPath: 'assets/env-craft.png', framePaths: frames('fletch'), durationMs: 1000 },
  craft: { envPath: 'assets/env-craft.png', framePaths: frames('craft'), durationMs: 1000 },
  rune: { envPath: 'assets/env-rune.png', framePaths: frames('rune'), durationMs: 1000 },
  herb: { envPath: 'assets/env-herb.png', framePaths: frames('herb'), durationMs: 1100 },
  agility: { envPath: 'assets/env-run.png', framePaths: frames('agility'), durationMs: 720 },
  summon: { envPath: 'assets/env-summon.png', framePaths: frames('summon'), durationMs: 1100 },
  astro: { envPath: 'assets/env-astro.png', framePaths: frames('astro'), durationMs: 1200 },
  altmagic: { envPath: 'assets/env-altmagic.png', framePaths: frames('altmagic'), durationMs: 1000 },
  map: { envPath: 'assets/env-map.png', framePaths: frames('map'), durationMs: 1100 },
  dig: { envPath: 'assets/env-dig.png', framePaths: frames('dig'), durationMs: 1000 },
  harvest: { envPath: 'assets/env-harvest.png', framePaths: frames('harvest'), durationMs: 1000 },
};

const IDLE_ENV = {
  combat: 'assets/env-combat.png',
  attack: 'assets/env-combat.png',
  idle: 'assets/env-idle.png',
};

export function resolveScene(anim) {
  const framed = FRAME_SCENES[anim];
  if (framed) {
    return {
      mode: 'frames',
      envPath: framed.envPath,
      sheet: {
        ...CANVAS,
        framePaths: framed.framePaths,
        propPath: framed.propPath || null,
        durationMs: framed.durationMs,
      },
    };
  }

  return {
    mode: 'idle-sprite',
    envPath: IDLE_ENV[anim] || IDLE_ENV.idle,
    spritePath: BASE_IDLE_SPRITE,
  };
}
