# Oak Street Rumble

Oak Street Rumble is a playable 2D beat-'em-up and the reference implementation for a deterministic, agent-native game runtime.

This repository is being bootstrapped from the verified Sol runtime handoff. The import is staged so the original playable game, runtime contracts, replay evidence, and provenance remain reviewable instead of arriving as one opaque bulk commit.

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

Human input, deterministic bots, replay, scripts, remote players, and future model controllers are intended to use the same governed runtime boundary.

The complete playable source will be imported in the next bounded rung after the verified runtime foundation is established.
