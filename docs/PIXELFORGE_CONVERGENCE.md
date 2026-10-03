# PixelForge convergence

Oak Street Rumble is the reference game for a deterministic, governed runtime.
Parallax PixelForge remains the creation platform and cartridge/studio ecosystem.

The current architecture should converge without forcing either project to become
the other:

```text
PixelForge Studio
    │
    ├─ Sprite / Tile / Map / Runtime authoring
    ├─ cartridge packaging
    └─ creator / playtest surfaces
             │
             ▼
Shared runtime contracts
    Controller
      → Observation
      → Intent
      → Action Bus
      → Authority
      → Rules
      → Simulation
      → Events
      → Reality Ledger
             │
       ┌─────┴─────┐
       ▼           ▼
Oak Street     Night Circuit
Rumble         (future adapter)
```

## Boundary rule

Promote a primitive into PixelForge's reusable runtime only after at least two
concrete games require the same behavior.

Oak-specific combat, bosses, rooms, shops, stealth and narrative stay in Oak.
Night-Circuit-specific mechanics stay in Night Circuit. Shared controller,
authority, observation, event, deterministic replay and world-state contracts
may move downward once duplication is proven.

## Immediate proof sequence

1. Keep Oak playable as the parity/acceptance harness.
2. Add a concrete ScriptController scenario that navigates through Observation
   and the Action Bus without privileged world mutation.
3. Build the smallest possible Night Circuit adapter.
4. Compare both adapters and extract only actual duplication into PixelForge.
5. Add optional model controllers outside deterministic simulation after the
   controller boundary is proven by human, bot, script and replay seats.

The goal is not a generic engine by declaration. The goal is a shared runtime
whose boundaries survive two different games.
