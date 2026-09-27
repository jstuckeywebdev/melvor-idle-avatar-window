/**
 * In-page Avatar panel (Melvor UI block).
 * Floating / pop-out / drag deferred — mounts into the main game layout.
 */

function createStore(initial) {
  const listeners = new Set();
  const state = { ...initial };

  function emit() {
    for (const listener of listeners) listener(state);
  }

  return {
    get state() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setEquipment(equipment) {
      state.equipment = equipment;
      emit();
    },
    setActivity(activity) {
      const prev = state.activity;
      state.activity = activity;
      if (
        prev?.animation === activity?.animation &&
        prev?.label === activity?.label &&
        prev?.media === activity?.media &&
        prev?.skillId === activity?.skillId
      ) {
        return;
      }
      emit();
    },
    setFlashAnimation(flashAnimation) {
      if (state.flashAnimation === flashAnimation) return;
      state.flashAnimation = flashAnimation;
      emit();
    },
    setHealth(health) {
      const prev = state.health;
      state.health = health;
      if (JSON.stringify(prev) === JSON.stringify(health)) return;
      emit();
    },
    pushGain(entry) {
      const existing = state.gains.find(
        (g) => g.type === entry.type && g.text === entry.text && g.media === entry.media
      );
      if (existing && Date.now() - existing.createdAt < 1500) {
        existing.quantity += entry.quantity || 0;
        existing.createdAt = Date.now();
      } else {
        state.gains = [entry, ...state.gains].slice(0, 12);
      }
      state.floaters = [
        {
          id: entry.id,
          media: entry.media,
          quantity: entry.quantity,
          text: entry.text,
        },
        ...state.floaters,
      ].slice(0, 6);
      emit();
      setTimeout(() => {
        state.floaters = state.floaters.filter((f) => f.id !== entry.id);
        emit();
      }, 1200);
    },
    pruneGains(cutoff, max) {
      const next = state.gains.filter((g) => g.createdAt >= cutoff).slice(0, max);
      if (next.length === state.gains.length) return;
      state.gains = next;
      emit();
    },
    setVisible(visible) {
      state.visible = visible;
      emit();
    },
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Skilling minibar: the vertical button stack on the right of a skill page. */
function findMinibar() {
  const known = document.querySelector(
    '#skill-footer-minibar, #skill-minibar, .skill-minibar, [id*="footer-minibar"], [id*="minibar"]'
  );
  if (known && !known.closest('#avatar-window-root') && !known.closest('#aw-dock')) {
    const r = known.getBoundingClientRect();
    if (r.width > 0 && r.width < 160 && r.right > window.innerWidth - 140) return known;
  }

  const parked = document.querySelector('#aw-dock > :not(#avatar-window-root)');
  if (parked) return parked;

  let best = null;
  let bestScore = 0;
  for (const el of document.querySelectorAll('div')) {
    if (el.closest('#avatar-window-root') || el.id === 'aw-dock') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 36 || r.width > 96 || r.height < 72 || r.height > 480) continue;
    if (r.right < window.innerWidth - 48) continue;
    const buttons = el.querySelectorAll('button, a.btn, .btn').length;
    if (buttons < 2) continue;
    const score = buttons * 20 - r.width;
    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }
  return best;
}

function dockBesideMinibar(root) {
  const bar = findMinibar();
  if (!bar || !bar.parentElement) {
    root.classList.add('aw-dock-fallback');
    if (root.parentElement !== document.body) document.body.appendChild(root);
    return;
  }

  root.classList.remove('aw-dock-fallback');
  let dock = document.getElementById('aw-dock');
  if (!dock || !dock.contains(bar)) {
    dock?.remove();
    dock = document.createElement('div');
    dock.id = 'aw-dock';
    const cs = getComputedStyle(bar);
    const rect = bar.getBoundingClientRect();
    if (cs.position === 'fixed' || cs.position === 'absolute') {
      dock.dataset.awPinned = cs.position;
      dock.style.position = 'fixed';
      dock.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
      dock.style.bottom = `${Math.max(8, window.innerHeight - rect.bottom)}px`;
      dock.style.zIndex = cs.zIndex || '40';
      bar.style.position = 'relative';
      bar.style.inset = 'auto';
    }
    bar.parentElement.insertBefore(dock, bar);
    dock.appendChild(bar);
  }
  if (root.parentElement !== dock) dock.appendChild(root);
}

export async function createPanel(ctx) {
  const appearanceApi = await ctx.loadModule('src/appearance.mjs');
  const osrsApi = await ctx.loadModule('src/osrsCharacter.mjs');
  const { loadPanelVisible, savePanelVisible } = appearanceApi;
  const { resolveScene } = osrsApi;

  const icons = {
    close: ctx.getResourceUrl('assets/icon-close.svg'),
  };

  const store = createStore({
    equipment: { slots: {}, layers: [], isWeapon2H: false },
    activity: { animation: 'idle', label: 'Idle', media: null, skillId: null },
    flashAnimation: null,
    health: null,
    gains: [],
    floaters: [],
    visible: loadPanelVisible(ctx),
  });

  let root = null;
  let unsubscribe = null;
  let eventsBound = false;
  let lastSceneKey = null;
  let mineAnimTimer = null;
  let mineFrameIndex = 0;
  let activeMineFrames = null;
  let activeMineDuration = 840;

  function stopMineAnim() {
    if (mineAnimTimer != null) {
      clearInterval(mineAnimTimer);
      mineAnimTimer = null;
    }
    mineFrameIndex = 0;
  }

  function startMineAnim(img, frameUrls, durationMs) {
    stopMineAnim();
    if (!img || !frameUrls?.length) return;
    const stepMs = Math.max(50, Math.round(durationMs / frameUrls.length));
    mineFrameIndex = 0;
    img.src = frameUrls[0];
    mineAnimTimer = setInterval(() => {
      if (!img.isConnected) {
        stopMineAnim();
        return;
      }
      mineFrameIndex = (mineFrameIndex + 1) % frameUrls.length;
      img.src = frameUrls[mineFrameIndex];
    }, stepMs);
  }

  function wireMineAnimIfNeeded() {
    const img = root?.querySelector('[data-aw-mine-anim]');
    if (!img || !activeMineFrames?.length) {
      stopMineAnim();
      return;
    }
    if (mineAnimTimer != null && img.dataset.awMineWired === '1') return;
    img.dataset.awMineWired = '1';
    startMineAnim(img, activeMineFrames, activeMineDuration);
  }

  function ensureRoot() {
    if (root && root.isConnected) return root;

    root = document.createElement('div');
    root.id = 'avatar-window-root';
    root.className = 'aw-root aw-inpage';
    dockBesideMinibar(root);
    bindRootEvents(root);
    return root;
  }

  function bindRootEvents(el) {
    if (eventsBound) return;
    eventsBound = true;
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-aw-action]');
      if (!btn || !el.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      if (btn.getAttribute('data-aw-action') === 'hide') setVisible(false);
    });
  }

  function sceneKey(s) {
    return `${s.flashAnimation || s.activity.animation || 'idle'}`;
  }

  function renderSceneHtml(s) {
    const anim = s.flashAnimation || s.activity.animation || 'idle';
    const scene = resolveScene(anim);
    const envUrl = ctx.getResourceUrl(scene.envPath);

    if (scene.mode === 'frames' || scene.mode === 'mine-frames') {
      const frameUrls = scene.sheet.framePaths.map((p) => ctx.getResourceUrl(p));
      const propPath = scene.sheet.propPath || scene.sheet.rockPath;
      const propUrl = propPath ? ctx.getResourceUrl(propPath) : '';
      activeMineFrames = frameUrls;
      activeMineDuration = scene.sheet.durationMs;
      return `
        <div class="aw-world aw-world-mining">
          <img class="aw-world-bg" src="${envUrl}" alt="" draggable="false"/>
          <div class="aw-world-vignette"></div>
          <div class="aw-actor aw-actor-sheet">
            <div class="aw-mine-layers">
              ${
                propUrl
                  ? `<img class="aw-mine-rock" src="${propUrl}" alt="" draggable="false"/>`
                  : ''
              }
              <img
                class="aw-char-sprite aw-mine-frame"
                data-aw-mine-anim
                src="${frameUrls[0] || ''}"
                alt=""
                draggable="false"
              />
            </div>
            <div class="aw-contact-shadow" aria-hidden="true"></div>
          </div>
        </div>`;
    }

    activeMineFrames = null;
    const spriteUrl = ctx.getResourceUrl(scene.spritePath);
    return `
      <div class="aw-world">
        <img class="aw-world-bg" src="${envUrl}" alt="" draggable="false"/>
        <div class="aw-world-vignette"></div>
        <div class="aw-actor aw-pose-idle">
          <img class="aw-char-sprite" src="${spriteUrl}" alt="Avatar" draggable="false"/>
          <div class="aw-contact-shadow" aria-hidden="true"></div>
        </div>
      </div>`;
  }

  function activityHtml(s) {
    const activityIcon = s.activity.media
      ? `<img class="aw-activity-icon" src="${s.activity.media}" alt="" />`
      : '';
    return `${activityIcon}<span>${escapeHtml(s.activity.label)}</span>`;
  }

  function render() {
    const el = ensureRoot();
    dockBesideMinibar(el);
    const s = store.state;
    el.style.display = s.visible ? '' : 'none';
    el.classList.toggle('aw-hidden', !s.visible);

    const key = sceneKey(s);
    const panel = el.querySelector('.aw-panel');

    if (panel && lastSceneKey !== null) {
      const sceneHost = el.querySelector('[data-aw-scene]');
      if (sceneHost && key !== lastSceneKey) {
        stopMineAnim();
        sceneHost.innerHTML = renderSceneHtml(s);
        lastSceneKey = key;
      }
      wireMineAnimIfNeeded();
      const activity = el.querySelector('.aw-activity');
      if (activity) activity.innerHTML = activityHtml(s);
      return;
    }

    lastSceneKey = key;
    el.innerHTML = `
      <div class="aw-stage">
        <button type="button" class="aw-btn aw-close" data-aw-action="hide" title="Hide">
          <img src="${icons.close}" alt="Close"/>
        </button>
        <div data-aw-scene>${renderSceneHtml(s)}</div>
        <div class="aw-activity">${activityHtml(s)}</div>
      </div>
    `;
    wireMineAnimIfNeeded();
  }

  function setVisible(visible) {
    store.setVisible(visible);
    savePanelVisible(ctx, visible);
  }

  function toggleVisible() {
    setVisible(!store.state.visible);
  }

  ensureRoot();
  unsubscribe = store.subscribe(() => render());
  render();

  return {
    store,
    setVisible,
    toggleVisible,
    destroy() {
      if (unsubscribe) unsubscribe();
      stopMineAnim();
      root?.remove();
      root = null;
    },
  };
}
