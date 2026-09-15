# Game architecture

The `game` directory is the domain layer. It contains state, catalogs, persistence and systems that do not depend on Phaser or the DOM.

Dependency direction:

- `game/types.ts` defines domain contracts.
- `game/catalog.ts` contains static game data.
- `game/store.ts` owns mutable domain state and subscriptions.
- `game/systems/*` implement game rules.
- `game/persistence.ts` serializes versioned save data.
- Phaser scenes and DOM UI should consume this layer; the domain layer must not import Phaser or DOM APIs except the persistence adapter's browser `Storage` boundary.

This deliberately uses a small systems architecture rather than ECS: Core2D benefits from explicit domain services without the complexity of a general entity-component framework.
