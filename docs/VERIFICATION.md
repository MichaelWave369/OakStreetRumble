# Oak Street Rumble — verification and handoff

Verified 2026-10-03. The imported prototype remains the playable acceptance game.
The delivered candidate adds a deterministic 60 Hz headless runtime, strict
Action Bus, controller/authority/observation boundaries, semantic ledger,
versioned resumable world saves, hierarchical views and exact replay. The existing
content and numerical combat rules remain in the Oak adapter. No provider or new
framework dependency was added.

## Final checks

| Check                    | Result                                                                                    | Evidence inside the source package                    |
| ------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Clean install            | PASS — `npm ci --ignore-scripts --no-audit --no-fund`, 423 packages                       | `artifacts/npm-ci.log`                                |
| Scaffold scripts         | PASS — 197 tests                                                                          | `artifacts/tests-final.log`                           |
| Existing library helpers | PASS — 55 tests                                                                           | `artifacts/tests-final.log`                           |
| Game/runtime             | PASS — 116 tests                                                                          | `artifacts/game-tests.log`, `tests/game/`             |
| Typecheck                | PASS — app, runtime, tests and standalone                                                 | `artifacts/typecheck.log`                             |
| Lint                     | PASS — zero errors, one retained auth-scaffold warning                                    | `artifacts/lint.log`                                  |
| Production build         | PASS — existing Vite/TanStack/Nitro application                                           | `artifacts/build.log`                                 |
| Offline export           | PASS — installed Vite, embedded sprites and code                                          | `artifacts/html.log`, `Oak-Street-Rumble.html`        |
| Browser playability      | PASS — development, production and offline export at desktop/mobile viewports             | `artifacts/verification/{dev,production,standalone}/` |
| Headless replay          | PASS — seeded duel/combat and three exported human runs                                   | `artifacts/verification/`                             |
| Source audit             | 115 source/configuration/style/tooling files inventoried with hashes and effect callsites | `artifacts/audit-sources.json`                        |

There are **368 passing tests**: 197 scaffold + 55 existing library + 116 game.
Node 24.19.0 and npm 11.9.0 were used. The remaining ESLint warning is an unused
disable in the original `src/lib/auth/use-current-user.ts`. The production bundler
also prints warnings for existing dependency directives; no build failure results.
No external database was configured or needed; the template migration step skips
when DATABASE_URL is absent.

## Gameplay preservation and intentional fixes

The original engine and content are byte-identical acceptance fixtures. Nineteen
parity scenarios compare legacy gameplay fields on **16,420 ticks**, covering
calm and active bot crews at three seeds, human keyboard/arrow fallback, a human
partner with Wren, Sable's duel, all eight boss patterns, H handoff and paused-map
timers. The fixture receives the same seeded random sequence. Comparisons omit
new identity/event/RNG bookkeeping; dedicated assertions cover intentional repairs.

Engine tests also cover four fighters' movement, jumps, attacks, damage,
blocking, passive gear and specials; stealth/detection/smoke/hiding; room reach,
capability gates and backtracking; all twelve shops, inventory, boss outcomes,
revival, retry, unique actor IDs, persistence failure/migration/restoration,
observations, immutable host views, authority rejection, bot policy, network
ingress and replay divergence. A headless tripwire throws if simulation calls
ambient Math.random, Date.now or fetch.

Intentional defects repaired:

- Retry restores the actor's alive flag as well as HP.
- Player, partner and Wren have distinct actor identities.
- Quiet Wrap captures crouched attack posture and the actual attacking actor.
- Mobile title/menu no longer clips above the canvas; touch exposes shop, hide,
  map and handoff. Offline fighter preview sprites resolve embedded images.
- Scaffold lockfile/PWA fixtures/lint and the host-specific export bundler are
  repaired independently of gameplay.
- Authority transfer does not alter actor tuning. H explicitly retains the
  original autonomy mode through a separate validated action.
- Walking through an exit keeps the actual MOVE controller as its origin; it
  cannot impersonate a delegated navigation controller. Legacy auto traversal
  is an explicit action parameter with the same rule checks for every controller.

The original numeric auto-mode tuning, bot thresholds, quiet-room traversal,
gear activation, narrative, colors, sprites, crew, map and modes are preserved.

## Deterministic replay receipts

These hashes include the complete runtime snapshot, authority, RNG, action
sequence and ledger. Tests additionally compare canonical snapshots directly.

| Recorded fixture                                        | Ticks | Resulting hash             | Result                |
| ------------------------------------------------------- | ----: | -------------------------- | --------------------- |
| Sable duel, seed 369                                    |  1800 | `fnv1a64:e46980e4a45f06f0` | Exact replay          |
| Active agent crew, seed 369, explicit alert=100 fixture |  1800 | `fnv1a64:05be62467140362e` | Exact replay          |
| Development browser human export                        |   101 | `fnv1a64:cf264dfce1ce6367` | Exact headless replay |
| Production browser human export                         |   100 | `fnv1a64:5a3e0452eefd3188` | Exact headless replay |
| Offline browser human export                            |   121 | `fnv1a64:408c08f34ab19032` | Exact headless replay |

Human recording lengths differ because browser interactions occur at different
wall-clock times. Each recorded initial snapshot and ordered tick/action stream
reproduces its own exact result; these are not claimed to be identical inputs.
Headless receipts and JSON recordings are included under `artifacts/verification/`.
The map's **Save replay** button exports actual played runs. Checkpoints resume a
new recording segment from the saved full snapshot.

Determinism is verified for the same JavaScript numeric environment and matching
rules/content versions. Cross-platform floating-point lockstep is not promised.
FNV is a diagnostic integrity hash, not a cryptographic signature.

## Browser verification and limits

Chromium checked development, built production and the offline HTML at
1280×800 and 390×844. Desktop checks exercised new-run setup, loaded preview
sprites, keyboard movement, map pause/resume, Wren summon/dismiss, player-two
arrows/removal, H handoff/return, shop purchase, replay download and saved-run
reload/Continue. Mobile checks exercised visible menus, horizontal fit, movement
through the touch pad's pointer path and presence of world/stealth controls.
Receipts show no local page/console errors or failed unstubbed requests.
Screenshots were inspected, including the repaired mobile title and replay map.

This runner cannot reach the original Google font CSS or Grok extension. Browser
QA explicitly stubs those two presentation requests for app builds, records the
URLs, and preserves production branding/font source. The offline HTML has no
external requests and uses system fonts. A runner-only shim for a denied
os.networkInterfaces call allowed Vite QA servers to start; it is not shipped as
an application dependency. No physical gamepad, live WebRTC peer, model provider
or external database was exercised.

## Baseline provenance and review

The original supplied zip is unchanged. Its SHA-256 is
`704d1491946ce252fd51836afdd73253a07698502e5a33caa08be8751b077ccd`.
The source package includes it as `artifacts/baseline/original-prototype.zip`.
Fixture SHA-256 values:

| Original source | Preserved fixture                   | SHA-256                                                            |
| --------------- | ----------------------------------- | ------------------------------------------------------------------ |
| engine.ts       | `tests/fixtures/original-engine.ts` | `31b6045755e76149ac3322e6b4231c571deb22b995716944990c174535f279bb` |
| content.ts      | `tests/fixtures/content.ts`         | `c95ff043f225a3698294359ba9b39f68d2670ffd7c68e730c756b9ba4d308bf7` |

`artifacts/baseline/` preserves failing import receipts. The audit separates
missing lock entries, eight PWA-fixture failures and generated-bundle lint noise
from game defects. `docs/AUDIT.md` contains controls, systems and coupling.

Local commits separate baseline, audit/stabilization, simulation extraction,
core contracts, playable integration and subsequent authority/validation repairs.
The core-foundation commit was independently checked with all scaffold/library
tests, seven early engine tests and typecheck before the UI migration
(`artifacts/foundation-*.log`). The source package includes review patches and a
Git bundle; no upstream remote, PR, merge or deployment was invented.

## Reproduce and continue

From the unpacked source directory:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run build:html
npm run simulate -- --mode duel --seed 369 --ticks 1800
npm run simulate -- --mode combat --seed 369 --ticks 1800
npm run simulate -- --replay artifacts/verification/standalone/human-replay.json
```

For browser checks, install/use a compatible Playwright Chromium and run
`npm run qa:browser -- http://127.0.0.1:8080/` against a running local server.
`OAK_CHROMIUM_PATH` can select an existing Chromium. Open the root HTML directly
for offline play; browser storage support on file URLs varies.

Live networking remains disconnected pending authenticated Action Bus transport.
Model/remote/script/gamepad contracts are extension points; model calls remain
outside simulation. The world hierarchy reflects Oak's concrete districts/rooms;
inactive encounters are not invented. Φ: Night Circuit is not ported here.
See `docs/RUNTIME.md` for contracts and `docs/PHASES.md` for bounded next increments.
