# ScriptController acceptance

`ScriptController` is the first non-human controller consumer added after the
browser restoration.

It is intentionally small:

```text
Observation
   |
   v
ScriptProgram
   |
   v
ActionIntent[]
   |
   v
validation -> authority -> rules -> simulation -> ledger
```

The controller receives the immutable public `Observation` contract. It does
not receive `World`, runtime internals, RNG state, projectiles, pending rule
events or causal bookkeeping.

## Oak circuit mission

The acceptance mission begins as Brick with Wren and a bot-controlled Mara.
Human authority starts the session and delegates only:

- movement
- combat
- navigation
- inventory

to `script:oak-circuit`.

Purchases, authority and session capabilities remain human-only.

The observation-only mission then acquires:

```text
Grip Gloves
  -> Star Case
  -> Night Lens
  -> Market Crate
  -> Quiet Wrap
  -> Wire Ear
  -> Smoke Vial
```

and crosses the gated route through Oak, Pier, Roof, Mall, School, Service Vent,
Food Court, Gym, Night Circuit and Choir Sanctum.

The policy has semantic mission knowledge but no mutable world access. If a
pickup is outside perception range, it searches toward the room center until the
object becomes observable, then targets the observed coordinates.

## Why this matters

The acceptance test proves that a useful autonomous controller can inhabit Oak
without a privileged gameplay API. The same runtime boundary is therefore
available to:

- deterministic scripts
- model-backed controllers
- network players
- recorded replay
- future PixelForge authoring/runtime adapters

The script's resolved actions are stored as replay roots. Exact replay restores
the external controller as an inert port and does not execute the script program
again.

This is the contract PixelForge should consume, not Oak's combat implementation.
