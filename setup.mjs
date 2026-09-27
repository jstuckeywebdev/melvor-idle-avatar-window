export async function setup(ctx) {
  console.log('[Avatar Window] setup() running');

  const { createPanel } = await ctx.loadModule('src/panel.mjs');
  const { createHooks } = await ctx.loadModule('src/hooks.mjs');

  ctx.settings.section('General').add([
    {
      type: 'switch',
      name: 'show-on-load',
      label: 'Show avatar panel on load',
      hint: 'Show the avatar scene at the bottom right, beside the skill buttons',
      default: true,
    },
  ]);

  ctx.settings.section('Gains').add([
    {
      type: 'switch',
      name: 'show-items',
      label: 'Show item gains',
      default: true,
    },
    {
      type: 'switch',
      name: 'show-xp',
      label: 'Show skill / abyssal XP',
      default: true,
    },
    {
      type: 'switch',
      name: 'show-mastery',
      label: 'Show mastery level ups',
      default: true,
    },
    {
      type: 'switch',
      name: 'show-currency',
      label: 'Show currency gains',
      default: true,
    },
  ]);

  let panel = null;
  let hooks = null;

  ctx.onInterfaceReady(async () => {
    console.log('[Avatar Window] onInterfaceReady');

    try {
      panel = await createPanel(ctx);
      console.log('[Avatar Window] panel created');

      const showOnLoad = ctx.settings.section('General').get('show-on-load');
      if (showOnLoad === false) {
        panel.setVisible(false);
      } else {
        panel.setVisible(true);
      }

      sidebar
        .category('Avatar', {
          before: 'Combat',
          name: 'Avatar',
        })
        .item('Avatar', {
          icon: 'assets/media/skills/combat/combat.svg',
          name: 'Avatar',
          onClick: () => {
            if (panel) panel.toggleVisible();
          },
        });

      console.log('[Avatar Window] sidebar item added');
    } catch (err) {
      console.error('[Avatar Window] failed to create panel/sidebar', err);
    }

    try {
      if (panel) {
        hooks = await createHooks(ctx, panel.store);
        console.log('[Avatar Window] hooks attached');
      }
    } catch (err) {
      console.error('[Avatar Window] hooks failed (panel should still work)', err);
    }

    console.log('[Avatar Window] Ready');
  });
}
