# Core2D architecture rules

1. `main.ts` is the composition root: it wires Phaser, the domain runtime and the DOM UI.
2. Phaser is an adapter/runtime, not the domain model.
3. `GameState` is the single source of truth for persistent gameplay state; Phaser GameObjects are views.
4. Systems contain game rules and must not import Phaser or DOM APIs.
5. Static item, recipe and tool definitions live in `catalog.ts`.
6. All gameplay actions enter through `GameCommand` and `GameRuntime.dispatch()`.
7. UI renders from `GameStore.subscribe()` and dispatches typed commands; it must not use `CustomEvent` or `MutationObserver` for state synchronization.
8. Persistence owns save keys, schema validation and migration boundaries.
9. Phaser Scene listeners must be released on `shutdown`/`destroy` so a scene can restart safely.
10. Domain systems are unit-testable without Phaser, DOM or browser rendering.
11. The first inventory row is the canonical quickbar; there is no second quickbar data model.
12. Vite builds only the source entry into `dist`; build scripts must not mutate gameplay source files.
13. World collision is a domain rule owned by `WorldSystem`; Phaser must not decide whether movement is legal.
14. Resource definitions, generation, target lookup, yields and depletion are domain responsibilities owned by `ResourceSystem`.
15. Phaser resource GameObjects are views of domain resources and must not carry authoritative gameplay state.
16. Spatial resource commands use world coordinates (`MINE_AT` / `CHOP_AT`); the renderer must not resolve resource identities.
