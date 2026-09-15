import type { RecipeId, ToolId } from './types';

export type GameCommand =
  | { type: 'CRAFT'; recipe: RecipeId }
  | { type: 'SELECT_TOOL'; tool: ToolId }
  | { type: 'ATTACK' }
  | { type: 'MINE' }
  | { type: 'PLANT' }
  | { type: 'WATER' }
  | { type: 'SAVE' }
  | { type: 'LOAD' };
