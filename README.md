# Oak Street Rumble

Oak Street Rumble is a playable 2D beat-'em-up and the reference implementation
for a deterministic, agent-native game runtime.

This repository is being bootstrapped from the verified Sol runtime handoff. The
import is staged so the original playable game, runtime contracts, replay evidence
and provenance remain reviewable instead of arriving as one opaque bulk commit.

## Runtime direction

Controllers produce intents through a shared boundary:

```text
Controller
→ Observation
→ Intent
→ Action Bus
→ Authority Validation
→ Game Rules
→ Simulation
→ Events
→ Reality Ledger
→ Observation
```

Human input, deterministic bots, replay, scripts, remote players and future model
controllers are intended to use the same governed runtime boundary.

The first foundation rung contains the provider/game/renderer-independent
Action Bus, authority, ledger, canonical hashing and serializable seeded RNG,
plus focused tests. The complete playable Oak adapter is the next staged import.

## Foundation check

Requires Node 24+:

```sh
npm test
```

## Architecture notes

- [Verified Sol handoff](docs/VERIFICATION.md)
- [Delivered phases and bounded next increments](docs/PHASES.md)
- [PixelForge convergence plan](docs/PIXELFORGE_CONVERGENCE.md)

Oak remains the playable acceptance harness. Reusable primitives move into
Parallax PixelForge only after a second concrete game proves that they are truly
shared rather than Oak-specific.
