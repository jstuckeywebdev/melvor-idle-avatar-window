const MAX_FEED = 12;
const FEED_TTL_MS = 8000;
const GAIN_TYPES = new Set([
  'AddItem',
  'SkillXP',
  'AbyssalXP',
  'MasteryLevel',
  'AddCurrency',
  'AddGP',
  'AddSlayerCoins',
]);

function notificationType(key) {
  return key?.type || key?._type || '';
}

function isGainEnabled(ctx, type) {
  const section = ctx.settings.section('Gains');
  const map = {
    AddItem: 'show-items',
    SkillXP: 'show-xp',
    AbyssalXP: 'show-xp',
    MasteryLevel: 'show-mastery',
    AddCurrency: 'show-currency',
    AddGP: 'show-currency',
    AddSlayerCoins: 'show-currency',
  };
  const setting = map[type];
  if (!setting) return false;
  return section.get(setting) !== false;
}

function safePatch(ctx, classRef, methodName, afterFn) {
  if (typeof classRef === 'undefined' || !classRef) return;
  try {
    ctx.patch(classRef, methodName).after(afterFn);
  } catch (err) {
    console.warn(`[Avatar Window] Could not patch ${methodName}`, err);
  }
}

function safeOn(target, event, handler) {
  if (!target || typeof target.on !== 'function') return;
  try {
    target.on(event, handler);
  } catch (err) {
    console.warn(`[Avatar Window] could not listen for ${event}`, err);
  }
}

function safeOff(target, event, handler) {
  if (!target || typeof target.off !== 'function') return;
  try {
    target.off(event, handler);
  } catch (_) {
    /* ignore */
  }
}

export async function createHooks(ctx, store) {
  const { getActivityState, isCombatActive } = await ctx.loadModule('src/activity.mjs');
  const { readEquipmentSnapshot } = await ctx.loadModule('src/equipment.mjs');

  const player = game?.combat?.player;
  if (!player) {
    throw new Error('game.combat.player is not available');
  }
  let activityTimer = null;
  let flashTimer = null;

  function refreshEquipment() {
    store.setEquipment(readEquipmentSnapshot(player));
  }

  function refreshActivity(forceAnimation) {
    const activity = getActivityState();
    if (forceAnimation) {
      store.setActivity({ ...activity, animation: forceAnimation });
    } else if (!store.state.flashAnimation) {
      store.setActivity(activity);
    } else {
      store.setActivity({ ...activity, animation: store.state.flashAnimation });
    }
    refreshHealth();
  }

  function refreshHealth() {
    const inCombat = isCombatActive();
    if (!inCombat) {
      store.setHealth(null);
      return;
    }

    const enemy = game.combat.enemy;
    store.setHealth({
      playerHp: player.hitpoints,
      playerMaxHp: player.stats.maxHitpoints,
      playerBarrier: player.barrier || 0,
      playerMaxBarrier: player.stats.maxBarrier || 0,
      enemyName: enemy?.name || 'Enemy',
      enemyMedia: enemy?.media || null,
      enemyHp: enemy?.hitpoints || 0,
      enemyMaxHp: enemy?.stats?.maxHitpoints || 0,
    });
  }

  function flash(animation, durationMs = 350) {
    store.setFlashAnimation(animation);
    refreshActivity(animation);
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      store.setFlashAnimation(null);
      refreshActivity();
    }, durationMs);
  }

  function pushGain(entry) {
    store.pushGain(entry);
  }

  function onEquipmentChanged() {
    refreshEquipment();
  }

  function onAttack() {
    flash('attack', 320);
  }

  function onHitByAttack() {
    flash('flinch', 280);
  }

  function onHitpointsChanged() {
    refreshHealth();
  }

  function onBarrierChanged() {
    refreshHealth();
  }

  function onMonsterSpawned() {
    refreshActivity();
    refreshHealth();
  }

  function onEnemyDeath() {
    refreshActivity();
    refreshHealth();
  }

  safeOn(player, 'equipmentChanged', onEquipmentChanged);
  safeOn(player, 'itemEquipped', onEquipmentChanged);
  safeOn(player, 'attack', onAttack);
  safeOn(player, 'hitByAttack', onHitByAttack);
  safeOn(player, 'hitpointsChanged', onHitpointsChanged);
  safeOn(player, 'barrierChanged', onBarrierChanged);
  safeOn(game.combat, 'monsterSpawned', onMonsterSpawned);

  const NotifClass =
    typeof NotificationsManager !== 'undefined' ? NotificationsManager : null;
  safePatch(ctx, NotifClass, 'addNotification', (_returnValue, key, notification) => {
    try {
      const type = notificationType(key);
      if (!GAIN_TYPES.has(type)) return;
      if (!isGainEnabled(ctx, type)) return;

      pushGain({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        media: notification?.media || '',
        quantity: notification?.quantity ?? 0,
        text: notification?.text || '',
        createdAt: Date.now(),
      });
    } catch (err) {
      console.warn('[Avatar Window] gain hook error', err);
    }
  });

  const CombatClass = typeof CombatManager !== 'undefined' ? CombatManager : null;
  safePatch(ctx, CombatClass, 'onEnemyDeath', () => {
    onEnemyDeath();
  });

  activityTimer = setInterval(() => {
    try {
      refreshActivity();
      const cutoff = Date.now() - FEED_TTL_MS;
      if (store.state.gains.some((g) => g.createdAt < cutoff)) {
        store.pruneGains(cutoff, MAX_FEED);
      }
    } catch (err) {
      console.warn('[Avatar Window] activity tick error', err);
    }
  }, 500);

  refreshEquipment();
  refreshActivity();
  refreshHealth();

  return {
    destroy() {
      if (activityTimer) clearInterval(activityTimer);
      if (flashTimer) clearTimeout(flashTimer);
      safeOff(player, 'equipmentChanged', onEquipmentChanged);
      safeOff(player, 'itemEquipped', onEquipmentChanged);
      safeOff(player, 'attack', onAttack);
      safeOff(player, 'hitByAttack', onHitByAttack);
      safeOff(player, 'hitpointsChanged', onHitpointsChanged);
      safeOff(player, 'barrierChanged', onBarrierChanged);
      safeOff(game.combat, 'monsterSpawned', onMonsterSpawned);
    },
  };
}
