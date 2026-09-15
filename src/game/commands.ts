import type { ItemId, RecipeId, ToolId } from './types';

export type GameCommand =
  | { type: 'TICK'; deltaSeconds: number }
  | { type: 'MOVE'; dx: number; dy: number; sprint: boolean }
  | { type: 'SELECT_TOOL'; tool: ToolId }
  | { type: 'TILL'; key: string }
  | { type: 'PLANT'; key: string }
  | { type: 'WATER'; key: string }
  | { type: 'HARVEST'; key: string }
  | { type: 'MINE'; resourceKey: string; ore: boolean }
  | { type: 'CHOP'; resourceKey: string }
  | { type: 'FISH' }
  | { type: 'ATTACK' }
  | { type: 'CRAFT'; recipe: RecipeId }
  | { type: 'EAT'; item: ItemId }
  | { type: 'USE_SALVE' }
  | { type: 'BUY_SEEDS'; cost?: number; amount?: number }
  | { type: 'SHIP' }
  | { type: 'DAMAGE'; amount: number }
  | { type: 'SAVE' }
  | { type: 'LOAD' };
