/** Paper-doll equipment slots (grid positions, not stacked overlays). */

export const DOLL_SLOTS = [
  { key: 'Helmet', label: 'Helmet', gridArea: 'helm' },
  { key: 'Cape', label: 'Cape', gridArea: 'cape' },
  { key: 'Amulet', label: 'Amulet', gridArea: 'amulet' },
  { key: 'Weapon', label: 'Weapon', gridArea: 'weapon' },
  { key: 'Platebody', label: 'Body', gridArea: 'body' },
  { key: 'Shield', label: 'Shield', gridArea: 'offhand' },
  { key: 'Quiver', label: 'Quiver', gridArea: 'offhand' },
  { key: 'Platelegs', label: 'Legs', gridArea: 'legs' },
  { key: 'Gloves', label: 'Gloves', gridArea: 'gloves' },
  { key: 'Boots', label: 'Boots', gridArea: 'boots' },
  { key: 'Ring', label: 'Ring', gridArea: 'ring' },
  { key: 'Gem', label: 'Gem', gridArea: 'gem' },
];

function slotMatches(equipped, key) {
  const slot = equipped?.slot;
  if (!slot) return false;
  const localID = slot.localID || '';
  const id = slot.id || '';
  return localID === key || id === key || id.endsWith(`:${key}`);
}

function findEquipped(equipment, key) {
  if (!equipment) return null;

  const direct =
    equipment.equippedItems?.[key] ||
    equipment.equippedItems?.[`melvorD:${key}`] ||
    equipment.equippedItems?.[`melvorF:${key}`];
  if (direct) return direct;

  if (Array.isArray(equipment.equippedArray)) {
    return equipment.equippedArray.find((entry) => slotMatches(entry, key)) || null;
  }

  return null;
}

function readSlot(equipment, key) {
  const slot = findEquipped(equipment, key);
  if (!slot || slot.isEmpty) return null;
  const item = slot.item;
  if (!item || item === game.emptyEquipmentItem) return null;
  const media = slot.media || item.media;
  if (!media) return null;
  return { key, media, name: item.name || key };
}

export function readEquipmentSnapshot(player) {
  const equipment = player?.equipment;
  if (!equipment) {
    return { slots: {}, isWeapon2H: false, layers: [] };
  }

  const isWeapon2H = Boolean(equipment.isWeapon2H);
  const slots = {};

  for (const def of DOLL_SLOTS) {
    if (isWeapon2H && (def.key === 'Shield' || def.key === 'Quiver')) {
      continue;
    }
    // Prefer Shield over Quiver in shared offhand cell
    if (def.key === 'Quiver' && slots.Shield) continue;

    const data = readSlot(equipment, def.key);
    if (data) {
      if (def.key === 'Quiver' || def.key === 'Shield') {
        slots.offhand = { ...data, gridArea: 'offhand', label: def.label };
      } else {
        slots[def.key] = { ...data, gridArea: def.gridArea, label: def.label };
      }
    }
  }

  // Keep layers for any legacy callers
  const layers = Object.values(slots);

  return { slots, isWeapon2H, layers };
}

/** Ordered cells for the paper-doll grid UI. */
export const PAPER_DOLL_CELLS = [
  { area: 'helm', keys: ['Helmet'], label: 'Helm' },
  { area: 'cape', keys: ['Cape'], label: 'Cape' },
  { area: 'amulet', keys: ['Amulet'], label: 'Amulet' },
  { area: 'weapon', keys: ['Weapon'], label: 'Weapon' },
  { area: 'body', keys: ['Platebody'], label: 'Body', isCenter: true },
  { area: 'offhand', keys: ['Shield', 'Quiver', 'offhand'], label: 'Off' },
  { area: 'legs', keys: ['Platelegs'], label: 'Legs' },
  { area: 'gloves', keys: ['Gloves'], label: 'Gloves' },
  { area: 'boots', keys: ['Boots'], label: 'Boots' },
  { area: 'ring', keys: ['Ring'], label: 'Ring' },
  { area: 'gem', keys: ['Gem'], label: 'Gem' },
];
