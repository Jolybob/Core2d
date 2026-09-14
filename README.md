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
- `src/game/WorldGenerator.ts` — deterministic procedural world generation
- `src/game/Inventory.ts` — inventory state

The prototype keeps gameplay state separate from rendering concerns where practical. The temporary rectangle renderer can therefore be replaced with proper tile/chunk rendering without rewriting the core game rules.

## Roadmap

1. Chunked world storage and streaming
2. Proper tile textures / sprite atlas
3. Tool and mining progression
4. Inventory + hotbar + item entities
5. Collision and world interaction rules
6. Crafting
7. Enemies and combat
8. Lighting / visibility
9. Save/load persistence
10. Multiplayer simulation and authoritative server
