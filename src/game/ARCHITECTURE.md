# Core2D architecture rules

1. Phaser is an adapter/runtime, not the domain model.
2. `GameState` contains persistent gameplay state; Phaser GameObjects are views.
3. Systems contain game rules and should not import Phaser or DOM APIs.
4. Static item, recipe and tool definitions live in `catalog.ts`.
5. UI should render from state and dispatch typed commands; it should not clone or observe other UI DOM.
6. Persistence serializes `SaveData` and owns migration boundaries.
7. The application composition root is `main.ts` and the domain runtime is `game/app-runtime.ts`.
8. Keep the architecture incremental: existing `CozyFarm` remains the adapter while responsibilities are moved into systems.
