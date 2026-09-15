import type { ItemId, InventoryLayoutState } from '../types';
import type { GameStatePort } from '../store-ports';

export const INVENTORY_SLOT_COUNT = 30;
export const HOTBAR_SIZE = 10;
export const HOTBAR_ROWS = 3;

const EMPTY_EQUIPMENT = {
  helm: null,
  chest: null,
  pants: null,
  lantern: null,
  offhand: null,
  necklace: null,
  ring1: null,
  ring2: null,
  bag: null,
  pouch1: null,
  pouch2: null,
  pouch3: null,
  pouch4: null,
  pet: null,
} as const;

export const createInitialInventoryLayout = (): InventoryLayoutState => ({
  slots: Array<ItemId | null>(INVENTORY_SLOT_COUNT).fill(null),
  locked: Array<boolean>(INVENTORY_SLOT_COUNT).fill(false),
  activeHotbarRow: 0,
  equipment: { ...EMPTY_EQUIPMENT },
});

const itemOrder = (counts: Record<ItemId, number>, preferred: ItemId[]): ItemId[] => {
  const result: ItemId[] = [];
  for (const id of preferred) if ((counts[id] ?? 0) > 0) result.push(id);
  for (const id of Object.keys(counts) as ItemId[]) if ((counts[id] ?? 0) > 0 && !result.includes(id)) result.push(id);
  return result;
};

export class InventorySystem {
  constructor(private readonly store: GameStatePort) {}

  initialize(): void {
    this.store.update((state) => {
      const layout = this.ensureLayout(state.inventoryLayout);
      layout.slots.fill(null);
      for (const slot of layout.locked.keys()) layout.locked[slot] = false;
      const preferred: ItemId[] = ['sword', 'pick', 'axe', 'hoe', 'seeds', 'water', 'rod', 'torch', 'berry', 'fish', 'parsnip', 'salve', 'wood', 'stone', 'ore', 'crystal', 'coal'];
      const items = itemOrder(state.inventory, preferred);
      let slot = 0;
      for (const id of items) {
        if (slot >= layout.slots.length) break;
        layout.slots[slot] = id;
        slot += 1;
      }
      state.inventoryLayout = layout;
    });
  }

  refresh(): void {
    this.store.update((state) => { state.inventoryLayout = this.ensureLayout(state.inventoryLayout); });
  }

  getLayout(): InventoryLayoutState { return this.store.select((state) => this.ensureLayout(state.inventoryLayout)); }

  move(source: number, target: number): boolean {
    if (!this.isSlot(source) || !this.isSlot(target) || source === target) return false;
    let changed = false;
    this.store.update((state) => {
      const layout = this.ensureLayout(state.inventoryLayout);
      if (layout.locked[target]) return;
      const sourceItem = layout.slots[source];
      if (!sourceItem && !layout.slots[target]) return;
      [layout.slots[source], layout.slots[target]] = [layout.slots[target], layout.slots[source]];
      changed = true;
      state.inventoryLayout = layout;
    });
    return changed;
  }

  toggleLock(slot: number): boolean {
    if (!this.isSlot(slot)) return false;
    this.store.update((state) => {
      const layout = this.ensureLayout(state.inventoryLayout);
      layout.locked[slot] = !layout.locked[slot];
      state.inventoryLayout = layout;
    });
    return true;
  }

  setHotbarRow(row: number): boolean {
    if (!Number.isInteger(row) || row < 0 || row >= HOTBAR_ROWS) return false;
    this.store.update((state) => {
      const layout = this.ensureLayout(state.inventoryLayout);
      layout.activeHotbarRow = row;
      state.inventoryLayout = layout;
    });
    return true;
  }

  sort(): boolean {
    this.store.update((state) => {
      const layout = this.ensureLayout(state.inventoryLayout);
      const movable = layout.slots.filter((_, index) => !layout.locked[index]).filter(Boolean) as ItemId[];
      const lockedSlots = new Set(layout.slots.map((item, index) => layout.locked[index] && item ? index : -1).filter((index) => index >= 0));
      layout.slots = Array<ItemId | null>(INVENTORY_SLOT_COUNT).fill(null);
      for (const index of lockedSlots) layout.slots[index] = this.ensureLayout(state.inventoryLayout).slots[index];
      movable.sort((a, b) => a.localeCompare(b));
      let cursor = 0;
      for (const item of movable) {
        while (cursor < INVENTORY_SLOT_COUNT && layout.slots[cursor] !== null) cursor += 1;
        if (cursor >= INVENTORY_SLOT_COUNT) break;
        layout.slots[cursor] = item;
      }
      state.inventoryLayout = layout;
    });
    return true;
  }

  selectItem(slot: number): ItemId | null {
    if (!this.isSlot(slot)) return null;
    return this.store.select((state) => this.ensureLayout(state.inventoryLayout).slots[slot] ?? null);
  }

  equip(slot: number, target: keyof InventoryLayoutState['equipment']): boolean {
    if (!this.isSlot(slot)) return false;
    let changed = false;
    this.store.update((state) => {
      const layout = this.ensureLayout(state.inventoryLayout);
      const item = layout.slots[slot];
      if (!item) return;
      const previous = layout.equipment[target];
      layout.equipment[target] = item;
      layout.slots[slot] = previous;
      changed = true;
      state.inventoryLayout = layout;
    });
    return changed;
  }

  quickStack(): boolean {
    // There is no chest system yet, so this deliberately behaves as a safe no-op.
    // The inventory still exposes the same command surface needed by the future chest container UI.
    return false;
  }

  private isSlot(slot: number): boolean { return Number.isInteger(slot) && slot >= 0 && slot < INVENTORY_SLOT_COUNT; }
  private ensureLayout(layout: InventoryLayoutState): InventoryLayoutState {
    const next = layout ?? createInitialInventoryLayout();
    if (!Array.isArray(next.slots) || next.slots.length !== INVENTORY_SLOT_COUNT) next.slots = [...createInitialInventoryLayout().slots];
    if (!Array.isArray(next.locked) || next.locked.length !== INVENTORY_SLOT_COUNT) next.locked = [...createInitialInventoryLayout().locked];
    if (!Number.isInteger(next.activeHotbarRow) || next.activeHotbarRow < 0 || next.activeHotbarRow >= HOTBAR_ROWS) next.activeHotbarRow = 0;
    next.equipment = { ...EMPTY_EQUIPMENT, ...(next.equipment ?? {}) };
    return next;
  }
}
