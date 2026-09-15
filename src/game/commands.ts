import type { ConsumableId, EquipmentSlot, RecipeId, ToolId } from './types';

export type GameCommand =
  | { type: 'TICK'; deltaSeconds: number }
  | { type: 'MOVE'; dx: number; dy: number; sprint: boolean; deltaSeconds: number }
  | { type: 'SELECT_TOOL'; tool: ToolId }
  | { type: 'TILL'; key: string }
  | { type: 'PLANT'; key: string }
  | { type: 'WATER'; key: string }
  | { type: 'HARVEST'; key: string }
  | { type: 'MINE_AT'; x: number; y: number }
  | { type: 'CHOP_AT'; x: number; y: number }
  | { type: 'FISH' }
  | { type: 'ATTACK' }
  | { type: 'CRAFT'; recipe: RecipeId }
  | { type: 'EAT'; item: ConsumableId }
  | { type: 'USE_SALVE' }
  | { type: 'BUY_SEEDS' }
  | { type: 'SHIP' }
  | { type: 'DAMAGE'; amount: number }
  | { type: 'INVENTORY_MOVE'; source: number; target: number }
  | { type: 'INVENTORY_LOCK'; slot: number }
  | { type: 'INVENTORY_SORT' }
  | { type: 'INVENTORY_HOTBAR_ROW'; row: number }
  | { type: 'INVENTORY_EQUIP'; slot: number; target: EquipmentSlot }
  | { type: 'INVENTORY_QUICK_STACK' }
  | { type: 'SAVE' }
  | { type: 'LOAD' };
