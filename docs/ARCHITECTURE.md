# Architecture Principle

## WorldRuntime is the simulation authority

**Make `WorldRuntime` the single authority for an infinite, chunk-addressed simulation.**

Phaser and `GameState` are adapters around `WorldRuntime`, not competing sources of truth.

```text
Phaser / UI
    ↓ inputs, commands, views
GameRuntime / Command Handler
    ↓
WorldRuntime — AUTHORITATIVE SIMULATION
    ├── ECS entities/components
    ├── chunk lifecycle + cache
    ├── tiles / collision
    ├── deterministic world generation
    ├── biomes / structures / dungeons
    ├── resources / enemies
    └── persistent world mutations
    ↓
Runtime persistence adapter / Save Schema
```

### Rules

1. **WorldRuntime owns the world.** Position, collision, tiles, chunks, resources, structures, enemies, entities, and persistent world modifications belong to the world runtime.
2. **No artificial global world bounds.** Do not use legacy finite-world dimensions as simulation limits. Address the world by tile and chunk coordinates and generate/load chunks on demand.
3. **Chunks are the fundamental world unit.** World coordinates resolve to a chunk, then to terrain, biome, structures, and entities within that chunk.
4. **Generation is deterministic and versioned.** Chunk generation is derived from `WorldSeed + GeneratorVersion + ChunkCoordinate + GenerationPass` so the same world produces the same chunk independently of load order, and cache entries cannot accidentally survive a generator change.
5. **One simulation authority.** Do not duplicate live world state between `GameState`, Phaser objects, or another world system. Runtime state lives in `WorldRuntime`; persistence-facing data is exported from it.
6. **Phaser is presentation.** Phaser handles input, camera, rendering, animation, effects, and UI. It must not own domain or simulation rules.
7. **GameState is not a world runtime.** It contains application/gameplay state such as player progression, inventory, quests, calendar, economy, and save metadata that is not world-owned simulation state.
8. **Persistence is separate from simulation.** Saving serializes durable `WorldRuntime` state through the dedicated runtime persistence adapter; loading rehydrates the existing runtime instead of making storage the live authority.
9. **Commands are the application boundary.** Player actions enter through the command layer, which validates/orchestrates runtime mutations and remains suitable for future server authority or multiplayer.
10. **Content is data-driven.** Biomes, structures, resources, enemies, items, recipes, and progression should be represented through registries/data rather than hard-coded per-world lists.
11. **Generated terrain is disposable.** `ChunkCache` stores generated runtime data only. Persistent changes belong in `ChunkPersistence` and must survive unload/reload.
12. **Runtime encapsulation is mandatory.** Callers use explicit `WorldRuntime` APIs and the persistence adapter; they must not mutate internal world state through returned references.

## Target flow

```text
world seed + generator version
    ↓
chunk coordinate
    ↓
terrain generation
    ↓
biome resolution
    ↓
structure generation
    ↓
resources / enemies / entities
    ↓
WorldRuntime ECS
    ↓
player interaction / commands
    ↓
persistent mutations
```

## Current status

The single-authority world architecture is implemented:

- `WorldRuntime` owns live world simulation and chunk lifecycle.
- `WorldSystem` is removed; collision and movement rules live in `WorldRuntime`.
- `WorldSaveData` is the durable world model; generated terrain is not serialized.
- `ChunkCache` is disposable and keyed by world seed, generator version, and chunk coordinate.
- `runtime-persistence.ts` is the dedicated world serialization/rehydration boundary.
- Phaser consumes runtime state and lifecycle as an adapter.

## Next architectural layer

The runtime is ready for a richer Core Keeper-style generation pipeline: biome regions, structures/scenes spanning chunks, generation passes, resource/enemy placement, and explicit streaming policy. Those features should be added inside the world-generation/runtime boundary rather than in Phaser.

> **WorldRuntime owns the world. GameRuntime orchestrates commands and application state. Phaser displays and collects inputs. Persistence stores what must survive. None of these roles should overlap.**
