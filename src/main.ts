// Core2D composition root.
// Domain state and rules live in ./game; rendering/UI adapters are started here.
import './polish.css';
import './corekeeper-ui.css';
import './game-ui.css';
import './backpack-quickbar.css';
import './accessibility-fix.ts';
import './version.ts';
import './ui-fix.ts';
import './backpack-quickbar.ts';
import './cozy-farm.ts';

// Importing the domain barrel here keeps the architecture visible at the application boundary.
// The FarmScene remains the Phaser adapter during the incremental migration.
import { GameRuntime } from './game/runtime';

export const gameRuntime = new GameRuntime();
