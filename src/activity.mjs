/** Map Melvor activeAction / combat state to avatar animation ids.
 *  Typed against melvor-idle-mod-dts (ActiveAction, BaseManager.isActive).
 */

/** Local skill id (after the namespace) -> avatar animation. */
const SKILL_ANIMATIONS = {
  Woodcutting: 'chop',
  Fishing: 'fish',
  Firemaking: 'fire',
  Cooking: 'cook',
  Mining: 'mine',
  Smithing: 'smith',
  Thieving: 'sneak',
  Fletching: 'fletch',
  Crafting: 'craft',
  Runecrafting: 'rune',
  Herblore: 'herb',
  Agility: 'agility',
  Summoning: 'summon',
  Astrology: 'astro',
  AlternativeMagic: 'altmagic',
  AltMagic: 'altmagic',
  // Alt magic trains the Magic skill outside combat. Combat is handled first.
  Magic: 'altmagic',
  Cartography: 'map',
  Archaeology: 'dig',
  Harvesting: 'harvest',
};

function animationForSkill(id) {
  if (!id) return 'work';
  const local = String(id).split(':').pop();
  return SKILL_ANIMATIONS[local] || 'work';
}

export function isCombatActive() {
  const combat = game?.combat;
  if (!combat) return false;
  if (combat.paused) return false;
  // BaseManager.isActive — only true while fighting
  if (combat.isActive) return true;
  return game.activeAction === combat;
}

export function getActivityState() {
  if (isCombatActive()) {
    const enemy = game.combat.enemy;
    return {
      animation: 'combat',
      label: enemy?.name || 'Combat',
      media: enemy?.media || game.combat.media,
      skillId: 'combat',
    };
  }

  const action = game?.activeAction;
  if (!action || action === game.combat || !action.isActive) {
    return {
      animation: 'idle',
      label: 'Idle',
      media: null,
      skillId: null,
    };
  }

  const id = action.id || '';
  const isAltMagic = action === game.altMagic || animationForSkill(id) === 'altmagic';
  const animation = isAltMagic ? 'altmagic' : animationForSkill(id);
  const rawName = action.name || 'Training';
  return {
    animation,
    label: isAltMagic && rawName === 'Magic' ? 'Alt. Magic' : rawName,
    media: action.media || null,
    skillId: id,
  };
}
