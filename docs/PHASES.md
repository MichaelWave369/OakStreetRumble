# Increment status and continuation

The imported game is the acceptance fixture. This extraction keeps its content
and numeric rules in place; it does not replace them with a new framework.

| Requested phase  | Delivered                                                                                                                      | Boundary / next concrete use                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| 1 Audit/baseline | Source inventory, coupling/gameplay/control audit, import receipts, isolated scaffold failures, original fixtures              | Original zip unchanged; no upstream repository was supplied                            |
| 2 Simulation     | Serializable seeded RNG, no storage/provider/renderer calls, fixed 60 Hz headless/runtime/UI path                              | Original auto-mode timer/movement tuning retained                                      |
| 3 Action Bus     | Typed strict schemas for every requested action plus lifecycle commands; attributed validation/application                     | Passive gear remains auto-equipped; no new slots                                       |
| 4 Controllers    | Keyboard, LocalBot, Replay and buffered port; legacy bot parity                                                                | Model/remote/script/gamepad interfaces are extension points, not complete integrations |
| 5 Authority      | Per-actor/per-capability grants, human-only purchases/management, action-based transfers                                       | Host registration/authentication stays outside the engine                              |
| 6 Observation    | Frozen nearby/room/radar profiles, bounded default perception, allowed capability types                                        | Future adapters must receive observe(), not trusted snapshots                          |
| 7 Reality Ledger | Append-only attributed decisions and semantic events with causal references                                                    | Event reducers project real consequences; no event-only arbitrary state patching       |
| 8 Persistence    | Versioned full checkpoint, ledger memory, validation, legacy progression migration, IndexedDB/fallback, Continue UI            | Local browser durability; no cloud sync                                                |
| 9 Nested world   | Natural district/zone/room/active-encounter view and compressed district observation                                           | No forced ECS or invented inactive encounters                                          |
| 10 Networking    | Existing mesh audited, disconnected production path preserved; bounded action ingress/event export tested                      | Live signaling/authentication/replication UI still needs a separate implementation     |
| 11 Replay        | Recorded roots + snapshot reproduce complete state/ledger/hash; divergence/version tests                                       | Same JS numeric/rules/content environment; new recordings after topology changes       |
| 12 Testing       | Actual game, original parity, replay, persistence, authority, bots and network-boundary tests; browser/dev/build/export checks | See VERIFICATION.md for exact results                                                  |

## Suggested next increments

1. Add one concrete ScriptController acceptance scenario that navigates Oak's
   exits using observations; avoid adding a generic planner until that scenario
   needs one. Preserve the calm bot policy separately from scripted navigation.
2. Build an authenticated local network host around the tested ingress. Specify
   host tick scheduling, per-peer observations, disconnect handling and snapshots
   before reconnecting the old WebRTC UI/helper. Keep host authority canonical.
3. Add a gamepad adapter using the same discrete controls and contract, proving
   the same recorded roots produce the same result.
4. Give Φ: Night Circuit a small second adapter using shared core primitives.
   Extract only the parts duplicated by both concrete games; Oak-specific combat
   and room content need not become a universal framework.
5. Put an optional model adapter outside simulation, receiving constrained
   observations and queueing validated intents. Record resolved intents for replay;
   provider responses and timing do not belong inside deterministic game rules.
6. Introduce fixed-point numeric rules only in a versioned migration if distributed
   cross-platform lockstep becomes a concrete requirement. Preserve old replays
   with their old rules/content fixture rather than silently changing them.

No provider account, hosting plan, signaling service, purchase, external repository
push, PR, merge or production deployment was needed for this package.
