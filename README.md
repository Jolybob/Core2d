# Core2D

Small browser-first 2D survival prototype built with Phaser 4 + TypeScript + Vite.

## Prototype

- Procedurally generated tile world
- WASD / arrow movement
- Camera follow + pixel-art rendering
- Left-click mining
- Resource counter
- Deterministic world seed

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Architecture

`WorldRuntime` is the **authoritative simulation boundary for the world**. Phaser is a rendering/input adapter and `GameStore` owns player/gameplay state that is not world simulation state.

```text
                         commands / input
                                |
                                v
                         GameCommandHandler
                                |
              +-----------------+-----------------+
              |                                   |
              v                                   v
        gameplay systems                      WorldRuntime
              |                         authoritative world simulation
              |                                   |
              |                    +--------------+--------------+
              |                    |              |              |
              v                    v              v              v
          GameStore          ECS entities    chunk lifecycle   persistence
       player/game state      components       + generation      boundary
              ^                    |              |
              |                    +------+-------+
              |                           |
              +---------------------------+
                                          |
                                      Phaser adapters
                                          |
                                          v
                                   rendering / camera
```

### WorldRuntime

`src/game/world/runtime.ts` is the single authority for world simulation. It owns:

- ECS entities, components, spatial indexing, and chunk-local entity indexing.
- Infinite chunk addressing and deterministic chunk generation.
- Loaded/unloaded chunk lifecycle.
- Tile reads and persistent tile modifications.
- World-object, crop, and resource persistence mutations.
- World rehydration and export at the persistence boundary.
- Movement/collision queries against authoritative world tiles.

The world is not bounded by a fixed rectangle. Coordinates are addressed through `ChunkCoord` / `ChunkKey`; generated terrain is deterministic from the world seed and chunk coordinate.

`ChunkCache` is deliberately disposable. Generated terrain is reconstructed when needed; only player/world mutations belong in `ChunkPersistence`.

### Persistence

World serialization is isolated in `src/game/world/runtime-persistence.ts`.

- `serializeWorld(runtime)` exports the authoritative runtime world.
- `rehydrateWorld(runtime, world)` replaces the runtime world and rebuilds runtime indexes/ECS state.
- Gameplay systems should not serialize or deserialize `GameState.world` directly.

`GameCommandHandler` is the command boundary for save/load. It refreshes system state, then saves the authoritative `WorldRuntime` rather than asking Phaser or individual systems to assemble a world snapshot.

### GameStore

`GameStore` remains responsible for game/application state such as the player inventory, economy, quests, and other non-world state. It is not the source of truth for terrain, chunks, world entities, crops, or resources.

Gameplay systems receive the same `WorldRuntime` instance when they need to read or mutate world state. This keeps movement, farming, resources, and world-object behavior on one authoritative simulation model.

### Phaser boundary

Phaser must not become a second world simulation. Its responsibilities are limited to:

- Translating input into game commands.
- Following the runtime/player position with the camera.
- Loading/rendering the runtime's loaded chunks.
- Rendering runtime entities such as resources, crops, and static world objects.
- Maintaining display objects and other presentation-only state.

When the player crosses chunks, the runtime owns the lifecycle decision; Phaser reflects the runtime lifecycle instead of maintaining its own authoritative chunk set.

### Working rules

When adding a new world feature:

1. Put authoritative world state and rules in `WorldRuntime` (or a world module owned by it).
2. Address persistent spatial data by chunk rather than by a finite world rectangle.
3. Expose explicit runtime APIs for gameplay systems instead of reaching through legacy world structures.
4. Keep generated data disposable and persist only player/world mutations.
5. Keep serialization/deserialization in the runtime persistence adapter.
6. Treat Phaser as an adapter: it may render and request actions, but it must not own authoritative world state.

This architecture is intentionally clean rather than compatibility-oriented: new gameplay code should target `WorldRuntime` directly instead of introducing another legacy-world path.
