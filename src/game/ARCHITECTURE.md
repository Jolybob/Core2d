# Game Architecture Rules

1. `main.ts` is the composition root for Phaser, the domain runtime, and DOM UI.
2. Phaser is an adapter/runtime, not the domain model.
3. `WorldRuntime` is the single source of truth for world simulation. `GameStore` owns non-world application/gameplay state; Phaser GameObjects are views.
4. Systems contain game rules and must not import Phaser or DOM APIs.
5. Static item, recipe, and tool definitions live in `catalog.ts`.
6. All gameplay actions enter through `GameCommand` and `GameRuntime.dispatch()`.
7. UI renders from `GameStore.subscribe()` and dispatches typed commands; do not use CustomEvent/MutationObserver for state synchronization.
8. Persistence owns save keys, schema validation, migration, and normalization. Current save schema is v5.
9. Phaser Scene listeners must be released on shutdown/destroy.
10. Domain systems must be unit-testable without Phaser, DOM, or browser rendering.
11. The first inventory row is the canonical quickbar.
12. Vite builds only the source entry into `dist`; build scripts must not mutate gameplay source.
13. World movement/collision is a `WorldRuntime` rule. No separate world simulation or collision authority may exist in Phaser, `GameStore`, or a legacy world system.
14. Resource definitions, generation, target lookup, yields, and depletion belong to domain services/systems, not rendering.
15. Phaser resource GameObjects are views, not authoritative state.
16. Spatial resource commands use world coordinates; the renderer does not resolve resource identities.
17. `GameRuntime` is the runtime/composition boundary; command dispatch is delegated to `GameCommandHandler`.
18. Player movement, tools, and consumables belong to `PlayerSystem`; shipping/buying belongs to `EconomySystem`; combat belongs to `CombatSystem`.
19. Loading a save rebuilds derived resource views from the seed and persistent world modifications.
20. Domain systems publish meaningful domain events instead of holding direct references to unrelated systems.
21. Domain events are past-tense facts such as `CROP_HARVESTED`, `ORE_MINED`, and `FISH_CAUGHT`, carrying only necessary context.
22. `DomainEventBus` is an in-process boundary; subscribers unsubscribe, and events do not replace explicit command sequencing.
23. `GameRuntime` owns dependency composition; `GameCommandHandler` receives explicit system dependencies so command routing is independently testable.
24. `GameStore` owns commit/notification flow. A mutation creates exactly one committed state snapshot, and notification reuses that snapshot instead of cloning the whole state again. `getState()` remains the explicit full-state isolation boundary for callers that need an independent mutable snapshot.
25. Save schema, validation, migration, and normalization belong to `save-schema.ts`; `persistence.ts` owns only storage I/O and JSON serialization. Schema logic must remain testable without `localStorage` or browser APIs.
26. `GameRuntime.dispatch()` executes each command inside one `GameStore.transaction()`. Nested system updates, including domain-event subscribers, share the same draft and produce one atomic commit/notification. Failed transactions roll back without notifying subscribers.
27. Domain systems use `GameStore.select()` for read-only queries instead of cloning the entire `GameState` with `getState()`. Selectors receive a deeply readonly view and return an isolated selected value, so read access cannot mutate authoritative state and remains cheaper for narrow queries.
28. `GameStore.subscribe()` is a read-only observation boundary. Listener and selector callbacks receive a deeply readonly `GameState` view, while mutations remain exclusively inside `update()`, `replace()`, and `transaction()`.
29. World terrain is addressed by `ChunkCoord` and `ChunkKey`; `CHUNK_SIZE` is 64. Systems must not assume a finite global world rectangle.
30. Procedural terrain is generated from `(worldSeed, generatorVersion, chunkCoord)`. Generated terrain is runtime/cache data and must not be serialized as the source of truth.
31. Only persistent world mutations belong in `ChunkPersistence`: modified tiles and removed entity identities. A chunk can be unloaded and deterministically regenerated without losing player changes.
32. `ChunkCache` is a disposable runtime cache. Its cache identity must include both world seed and generator version; it must never become the persistence authority.
33. World-owned persistence is represented by `WorldSaveData`; player-owned persistence is represented by `PlayerSaveData`. `SaveData` is the envelope that joins them for local storage.
34. Save schema migrations must preserve legacy v1-v4 saves and produce the v5 world/player envelope.
35. The world generator has an explicit version so generator changes can be migrated deliberately instead of silently changing existing worlds.
36. Entity IDs are domain identities, not Phaser object references. Future networking must be able to serialize commands/events using entity IDs without importing client/rendering types.
37. The next multiplayer boundary is the command layer: clients request actions, while authoritative simulation validates and commits them. Client rendering must never become the authority for world mutation.
38. `GameRuntime` owns one `WorldRuntime` instance for the live simulation. World-domain systems share that instance; loading a save rehydrates it instead of constructing parallel ECS runtimes.
39. `WorldRuntime` persistence access is encapsulated: callers use explicit runtime APIs or the dedicated persistence adapter; they must not mutate the runtime's internal world object through returned references.
40. There is exactly one world authority: `WorldRuntime`. Do not introduce replacement `WorldSystem`, finite-world bounds, parallel chunk managers, or mirrored world state in Phaser/GameStore.
