# Core2D Tilejam integration

This directory owns the integration boundary between Core2D and the upstream Tilejam dependency.

## Responsibilities

- Configure the pinned Tilejam dependency during the Core2D build.
- Inject the Core2D startup project into Tilejam without maintaining a fork.
- Generate `public/tilejam/core2d/project.json` for the bundled editor.
- Keep Core2D asset paths and Tilejam-specific build behavior out of `src/`.

## Asset flow

```text
public/assets/tilesets/Tileset.png
        │
        ▼
tools/tilejam/build.mjs
        │
        ├── configures Tilejam
        └── generates public/tilejam/core2d/project.json
                         │
                         ▼
                public/tilejam/
                         │
                         ▼
                    Tilejam editor
```

Tilejam remains an external Git dependency in `package.json`. The source is not copied into `src/` and the game runtime does not depend on Tilejam.
