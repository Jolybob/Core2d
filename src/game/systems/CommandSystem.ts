import type { GameCommand } from '../commands';
import type { GameRuntime } from '../runtime';

export class CommandSystem {
  constructor(private readonly runtime: GameRuntime) {}

  dispatch(command: GameCommand): void {
    switch (command.type) {
      case 'CRAFT': this.runtime.crafting.craft(command.recipe); break;
      case 'SELECT_TOOL': this.runtime.store.update((state) => { state.player.tool = command.tool; }); break;
      case 'ATTACK': break;
      case 'MINE': break;
      case 'PLANT': break;
      case 'WATER': break;
      case 'SAVE': break;
      case 'LOAD': break;
    }
  }
}
