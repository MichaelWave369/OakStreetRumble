# Deterministic runtime kernel

This rung separates **runtime governance** from **gameplay rules**.

```text
Controller
  -> Observation
  -> Intent
  -> Action Bus
  -> Authority
  -> OakRuntime
       |
       +-> OakRules
       |    -> World mutation
       |    -> semantic events
       |
       +-> Reality Ledger
       +-> replay recording
```

## Why the rules seam exists

The verified Sol handoff proved the full Oak game and deterministic runtime
together, but its adapter imported the concrete engine directly. PixelForge will
eventually need the runtime boundary without inheriting Oak-specific combat.

`OakRules` makes that dependency explicit.

The current `ContractRules` implementation is deliberately narrow. It proves:

- deterministic session creation,
- movement and jump integration,
- posture changes,
- capability-gated room traversal,
- runtime-owned authority transfer,
- snapshot/hash/replay behavior.

It **does not replace or approximate Oak combat**. Attack, shop, item and crew
actions return `LEGACY_RULES_NOT_IMPORTED` until the preserved engine is staged
behind a legacy rules adapter.

That keeps this rung honest: the runtime kernel is real, while gameplay parity
remains a separately testable import.

## Invariants

- Registering a controller grants observation/submission access only.
- Authority is explicit per actor/capability.
- Model, remote and script controllers enter through the same intent grammar.
- No provider call, network request, storage call, wall clock or renderer belongs
  inside deterministic simulation.
- Replay stores resolved external roots. Local deterministic policies are
  regenerated from observations.
- Snapshot identity includes runtime, rules and content versions.

## Next rung

Import the preserved Oak simulation as `LegacyOakRules`, then restore Sol's
combat, stealth, boss, shop and parity tests against the same runtime kernel.
