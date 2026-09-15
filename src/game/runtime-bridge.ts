import { appRuntime } from './app-runtime';
import { ITEM_IDS, type ItemId, type ToolId } from './types';

interface SceneState {
  health?: number;
  hunger?: number;
  stamina?: number;
  pickaxeLevel?: number;
  inventory?: Partial<Record<ItemId, number>>;
  selectedSlot?: number;
  hasSword?: boolean;
}

const TOOL_BY_SLOT: ToolId[] = ['sword', 'hoe', 'seeds', 'water', 'axe', 'pick', 'rod'];
let selectedSlot = 0;
let correctingSelection = false;

window.addEventListener('core2d:select', (event) => {
  const slot = Number((event as CustomEvent<{ slot?: number }>).detail?.slot);
  if (Number.isInteger(slot) && slot >= 0 && slot < TOOL_BY_SLOT.length) selectedSlot = slot;
});

window.addEventListener('core2d:state', (event) => {
  const incoming = (event as CustomEvent<SceneState>).detail ?? {};
  appRuntime.store.update((state) => {
    if (typeof incoming.health === 'number') state.player.health = incoming.health;
    if (typeof incoming.hunger === 'number') state.player.hunger = incoming.hunger;
    if (typeof incoming.stamina === 'number') state.player.stamina = incoming.stamina;
    if (typeof incoming.pickaxeLevel === 'number') state.player.pickaxeLevel = incoming.pickaxeLevel;
    if (incoming.inventory) {
      for (const id of ITEM_IDS) {
        const value = incoming.inventory[id];
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) state.inventory[id] = value;
      }
    }
    state.player.tool = TOOL_BY_SLOT[selectedSlot];
  });

  if (!correctingSelection && incoming.selectedSlot !== selectedSlot) {
    correctingSelection = true;
    window.dispatchEvent(new CustomEvent('core2d:state', { detail: { ...incoming, selectedSlot } }));
    correctingSelection = false;
  }
});
