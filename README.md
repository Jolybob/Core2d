# Core2D

A browser-based 2D survival/crafting prototype built with Phaser 4 and TypeScript.

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Controls

- **WASD / Arrow keys** — move
- **Left mouse button** — mine a tile within range

## Current architecture

- `src/main.ts` — Phaser bootstrap and scene orchestration
- `src/game/Tile.ts` — tile domain model and mining rules
- `src/game/Chunk.ts` — fixed-size chunk data container
- `src/game/World.ts` — lazy chunk lookup and world-coordinate access
- `src/game/WorldGenerator.ts` — deterministic, coordinate-based procedural generation
- `src/game/Inventory.ts` — inventory state

The gameplay domain is separated from rendering where practical. World chunks are generated lazily, so the storage layer is ready to evolve into viewport-based chunk streaming without changing mining or inventory rules.

## Roadmap

1. Viewport-based chunk streaming and unload policy
2. Proper tile textures / sprite atlas
3. Tool and mining progression
4. Inventory + hotbar + item entities
5. Collision and world interaction rules
6. Crafting
7. Enemies and combat
8. Lighting / visibility
9. Save/load persistence
10. Multiplayer simulation and authoritative server
