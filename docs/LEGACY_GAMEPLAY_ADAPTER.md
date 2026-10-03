# Preserved Oak gameplay adapter

This rung imports the verified Oak gameplay engine and places it behind the
runtime's `OakRules` boundary.

```text
Controller
  -> Observation
  -> Intent
  -> Action Bus
  -> Authority
  -> OakRuntime
       -> LegacyOakRules
            -> preserved engine.ts
       -> Reality Ledger
       -> Replay
```

## What is preserved

The imported engine retains Oak's existing numerical and content rules for:

- movement and lane limits,
- jump arcs,
- light/heavy attacks,
- combo and meter behavior,
- four character specials/passives,
- crew/revival behavior,
- stealth, crouch, crate hiding and smoke,
- detection/alert logic,
- room gates and gear pickup,
- shops and upgrades,
- enemy/boss behavior,
- projectiles, drops and room clear state.

The engine source is imported from the verified Sol handoff rather than rewritten
from memory.

## Adapter responsibility

`LegacyOakRules` translates accepted governed actions into the old engine's
per-tick input vocabulary. Direct session/shop/crew operations call the preserved
engine functions. Semantic events emitted by the engine are drained back into the
Reality Ledger.

Authority remains outside the gameplay engine. Registering a controller never
grants permission to act.

## Known bounded follow-up

The preserved engine may derive a room transition from an already-authorized MOVE
when a player crosses an edge. In this rung the adapter preserves the transition
and causal MOVE id directly. A later rung will promote that derived transition to
an explicit internally-generated `ENTER_ROOM` action without changing gameplay.

Likewise, the current runtime observes deterministic local bots before the
preserved engine advances the tick. The original Sol candidate has a stronger
sequential within-tick parity harness; restoring that full 16,420-tick harness is
the next acceptance step.
