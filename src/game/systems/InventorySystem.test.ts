import { describe, expect, it } from 'vitest';
import { GameStore, createInitialState } from '../store';
import { HOTBAR_ROWS, HOTBAR_SIZE, INVENTORY_SLOT_COUNT, InventorySystem } from './InventorySystem';

describe('InventorySystem', () => {
  it('initializes thirty slots and a ten-slot hotbar layout', () => {
    const store = new GameStore(createInitialState());
    const inventory = new InventorySystem(store);
    inventory.initialize();
    const layout = inventory.getLayout();
    expect(layout.slots).toHaveLength(INVENTORY_SLOT_COUNT);
    expect(layout.locked).toHaveLength(INVENTORY_SLOT_COUNT);
    expect(HOTBAR_SIZE).toBe(10);
    expect(HOTBAR_ROWS).toBe(3);
    expect(layout.slots.slice(0, 10).filter(Boolean).length).toBeGreaterThan(0);
  });

  it('moves items between slots and respects locked destinations', () => {
    const store = new GameStore(createInitialState());
    const inventory = new InventorySystem(store);
    inventory.initialize();
    const first = inventory.getLayout().slots[0];
    expect(first).toBeTruthy();
    expect(inventory.move(0, 12)).toBe(true);
    expect(inventory.getLayout().slots[12]).toBe(first);
    inventory.toggleLock(13);
    const before = inventory.getLayout();
    expect(inventory.move(12, 13)).toBe(false);
    expect(inventory.getLayout().slots[12]).toBe(first);
    expect(before.locked[13]).toBe(true);
  });

  it('switches hotbar rows and sorts unlocked item slots', () => {
    const store = new GameStore(createInitialState());
    const inventory = new InventorySystem(store);
    inventory.initialize();
    expect(inventory.setHotbarRow(2)).toBe(true);
    expect(inventory.getLayout().activeHotbarRow).toBe(2);
    expect(inventory.setHotbarRow(3)).toBe(false);
    expect(inventory.sort()).toBe(true);
    expect(inventory.getLayout().slots).toHaveLength(INVENTORY_SLOT_COUNT);
  });
});
