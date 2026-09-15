import type { EquipmentSlot, InventoryLayoutState, ItemId } from '../types';
import type { GameStatePort } from '../store-ports';

export const INVENTORY_SLOT_COUNT = 30;
export const HOTBAR_SIZE = 10;
export const HOTBAR_ROWS = 3;

const EMPTY_EQUIPMENT: Record<EquipmentSlot, ItemId | null> = {
  helm: null, chest: null, pants: null, lantern: null, offhand: null,
  necklace: null, ring1: null, ring2: null, bag: null,
  pouch1: null, pouch2: null, pouch3: null, pouch4: null, pet: null,
};

export const createInitialInventoryLayout = (): InventoryLayoutState => ({
  slots: Array<ItemId | null>(INVENTORY_SLOT_COUNT).fill(null),
  locked: Array<boolean>(INVENTORY_SLOT_COUNT).fill(false),
  activeHotbarRow: 0,
  equipment: { ...EMPTY_EQUIPMENT },
});

const PREFERRED_ORDER: ItemId[] = [
  'seeds', 'rod', 'torch', 'berry', 'fish', 'parsnip', 'salve',
  'sword', 'wood', 'stone', 'ore', 'crystal', 'coal',
];

const itemOrder = (counts: Record<ItemId, number>, preferred: ItemId[]): ItemId[] => {
  const result: ItemId[] = [];
  for (const id of preferred) if ((counts[id] ?? 0) > 0) result.push(id);
  for (const id of Object.keys(counts) as ItemId[]) {
    if ((counts[id] ?? 0) > 0 && !result.includes(id)) result.push(id);
  }
  return result;
};

export class InventorySystem {
  constructor(private readonly store: GameStatePort) {}

  initialize(): void {
    this.store.update((state) => {
      const layout = this.ensureLayout(state.inventoryLayout);
      layout.slots.fill(null);
      layout.locked.fill(false);
      for (const [slot, item] of itemOrder(state.inventory, PREFERRED_ORDER).entries()) {
        if (slot >= INVENTORY_SLOT_COUNT) break;
        layout.slots[slot] = item;
      }
      state.inventoryLayout = layout;
    });
  }

  refresh(): void {
    this.store.update((state) => {
      const layout = this.ensureLayout(state.inventoryLayout);
      if (!layout.slots.some(Boolean)) {
        for (const [slot, item] of itemOrder(state.inventory, PREFERRED_ORDER).entries()) {
          if (slot >= INVENTORY_SLOT_COUNT) break;
          layout.slots[slot] = item;
        }
      }
      state.inventoryLayout = layout;
    });
  }

  getLayout(): InventoryLayoutState { return this.store.select((state) => this.ensureLayout(state.inventoryLayout)); }

  move(source: number, target: number): boolean {
    if (!this.isSlot(source) || !this.isSlot(target) || source === target) return false;
    let changed = false;
    this.store.update((state) => {
      const layout = this.ensureLayout(state.inventoryLayout);
      if (layout.locked[target] || layout.locked[source]) return;
      if (!layout.slots[source] && !layout.slots[target]) return;
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
      const lockedItems = layout.slots.map((item, index) => layout.locked[index] ? item : null);
      const movable = layout.slots.filter((_, index) => !layout.locked[index]).filter(Boolean) as ItemId[];
      movable.sort((a, b) => a.localeCompare(b));
      layout.slots = lockedItems;
      let cursor = 0;
      for (const item of movable) {
        while (cursor < INVENTORY_SLOT_COUNT && layout.slots[cursor] !== null) cursor += 1;
        if (cursor >= INVENTORY_SLOT_COUNT) break;
        layout.slots[cursor] = item;
        cursor += 1;
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
      if (layout.locked[slot]) return;
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

  quickStack(): boolean { return false; }

  private isSlot(slot: number): boolean { return Number.isInteger(slot) && slot >= 0 && slot < INVENTORY_SLOT_COUNT; }

  private ensureLayout(layout: InventoryLayoutState | undefined): InventoryLayoutState {
    const next = layout ?? createInitialInventoryLayout();
    if (!Array.isArray(next.slots) || next.slots.length !== INVENTORY_SLOT_COUNT) next.slots = [...createInitialInventoryLayout().slots];
    if (!Array.isArray(next.locked) || next.locked.length !== INVENTORY_SLOT_COUNT) next.locked = [...createInitialInventoryLayout().locked];
    if (!Number.isInteger(next.activeHotbarRow) || next.activeHotbarRow < 0 || next.activeHotbarRow >= HOTBAR_ROWS) next.activeHotbarRow = 0;
    next.equipment = { ...EMPTY_EQUIPMENT, ...(next.equipment ?? {}) };
    return next;
  }
}
