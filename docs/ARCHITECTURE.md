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
    ├── chunks
    ├── tiles / collision
    ├── world generation
    ├── biomes
    ├── structures / dungeons
    ├── resources / enemies
    └── persistent world mutations
    ↓
Persistence / Save Schema
```

### Rules

1. **WorldRuntime owns the world.** Position, collision, tiles, chunks, resources, structures, enemies, entities, and persistent world modifications belong to the world runtime.
2. **No artificial global world bounds.** Do not use `WORLD_WIDTH` / `WORLD_HEIGHT` as simulation limits. Address the world by tile and chunk coordinates and generate/load chunks on demand.
3. **Chunks are the fundamental world unit.** World coordinates resolve to a chunk, then to terrain, biome, structures, and entities within that chunk.
4. **Generation is deterministic.** Chunk generation is derived from `WorldSeed + GeneratorVersion + ChunkCoordinate + GenerationPass` so the same world produces the same chunk independently of load order.
5. **One simulation authority.** Do not duplicate live player/world state between `GameState` and ECS components. Runtime state lives in `WorldRuntime`; persistence-facing state is serialized from it.
6. **Phaser is presentation.** Phaser handles input, camera, rendering, animation, effects, and UI. It must not own domain or simulation rules.
7. **GameState is not a second world runtime.** It should contain session/persistence concerns such as player progression, inventory, quests, calendar, economy, and save metadata where those are not already authoritative runtime components.
8. **Persistence is separate from simulation.** Saving serializes the durable parts of `WorldRuntime`; loading rehydrates the runtime without making storage the live authority.
9. **Commands are the application boundary.** Player actions enter through the command layer, which orchestrates world-runtime mutations and remains suitable for future server authority or multiplayer.
10. **Content is data-driven.** Biomes, structures, resources, enemies, items, recipes, and progression should be represented through registries/data rather than hard-coded per-world lists.

## Target flow

```text
world seed
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

## Migration priority

- **P0:** Remove finite-world assumptions; stop cloning the entire game state on every frame; make `WorldRuntime` the sole simulation authority.
- **P1:** Move resource generation into the chunk pipeline; add biome and structure generation; add chunk activation/unloading and deterministic generation tests.
- **P2:** Introduce data-driven content registries for world and gameplay content.
- **P3:** Migrate/remove the legacy `CozyFarm` boot path so Phaser becomes a thin adapter over `GameRuntime`.
- **P4:** Add behavioral tests for same-seed determinism, negative coordinates, chunk unload/reload, persistent edits, cross-chunk structures, and generator-version migrations.

> **WorldRuntime owns the world. GameRuntime orchestrates simulation. Phaser displays and collects inputs. Persistence stores what must survive. None of these roles should overlap.**
