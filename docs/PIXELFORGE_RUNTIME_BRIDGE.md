# PixelForge Runtime Bridge v1

Oak Street Rumble implements PixelForge's game-agnostic Runtime Bridge v1 without
moving Oak's gameplay engine into PixelForge.

```text
PixelForge / tool / controller host
              |
              v
     PixelForge Bridge v1
              |
              v
          OakRuntime
      /       |        \
 Authority   Rules    Ledger
              |
              v
       preserved gameplay
```

## Public bridge surface

Oak exposes exactly:

- `describe()`
- `registerController()`
- `observe()`
- `submit()`
- `advance()`
- `events()`
- `snapshot()`
- `recording()`
- `authority()`
- `hash()`

It deliberately does **not** expose `World`, `LegacyOakRules`, combat helpers,
RNG, rendering, audio or engine-private mutation functions.

## Registration is not authority

A PixelForge host may register an external controller before simulation begins.
Registration only creates a controller identity and observation binding.

For example:

```text
register script:pixelforge
        |
        +-> can observe bounded player view
        +-> allowedActions = []
```

The human/session authority must separately delegate capabilities through Oak's
normal `TRANSFER_AUTHORITY` action before the script can move, fight, navigate
or use inventory.

This preserves the runtime invariant:

```text
connected != authorized
```

## Submit semantics

`submit()` queues an already-resolved intent for a deterministic tick and returns
a queue receipt.

It does not claim the action is accepted. Acceptance or rejection is emitted only
when `advance()` processes the tick through identity checks, grammar validation,
authority and game rules.

## Why this is the bridge

PixelForge does not need to understand Oak's action names to host the runtime.
It can:

1. register a controller,
2. ask that controller's runtime for an observation,
3. submit one of the actions the observation permits,
4. advance the runtime,
5. inspect semantic events and receipts,
6. checkpoint, replay and compare hashes.

The same interface can host a cartridge with no combat at all. PixelForge's own
reference-counter fixture proves that independently.

## Coordinated PixelForge contract

The canonical generic contract lives in the Parallax PixelForge repository under:

```text
runtime/bridge-v1.js
docs/RUNTIME_BRIDGE_V1.md
```

Oak is the first full external game adapter for that contract.
