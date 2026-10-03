# Playable browser shell

The browser is an adapter around `OakRuntime`, not an alternate game engine.

```text
keyboard / touch / UI
        |
        v
Controller or typed intent
        |
        v
OakRuntime
        |
        +-> Authority
        +-> LegacyOakRules
        +-> Reality Ledger
        +-> Replay
        |
        v
immutable World snapshot
        |
        v
Canvas renderer / HUD / audio
```

## Browser-owned responsibilities

- requestAnimationFrame timing and fixed-step accumulation
- Canvas sizing and rendering
- keyboard/touch device state
- Web Audio presentation
- local checkpoint durability
- replay-file download
- title/story/select/shop/map overlays

The browser does not directly mutate game state.

## Save boundary

Checkpoints store the complete runtime snapshot, including authority and ledger.
The local envelope has its own canonical integrity hash. Browser wall-clock time
is used only to save a file; it never enters simulation, actions, observations or
replay state.

A checkpoint with a different runtime/content version is rejected rather than
silently migrated.

## Offline build

`npm run build:html` performs a production Vite build and inlines the generated
JavaScript and CSS into `Oak-Street-Rumble.html`. The resulting file can be
opened without a dev server.

## Deliberately not imported

The earlier Sol package lived inside a generic TanStack/auth/database scaffold.
The canonical Oak repository does not import that scaffold. React + Vite are the
only browser framework dependencies needed by the playable game.
