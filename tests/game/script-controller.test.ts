import assert from "node:assert/strict";
import test from "node:test";

import { ScriptController } from "../../src/game/controllers.ts";
import { oakCircuitMission } from "../../src/game/scripts/oak-circuit.ts";
import { OakRuntime, replay } from "../../src/game/runtime.ts";

const REQUIRED_GEAR = ["grip", "stars", "lens", "crate", "wrap", "wire", "smoke"];

function makeMission(seed = 369) {
  let observations = 0;

  const controller = new ScriptController("script:oak-circuit", (observation) => {
    observations += 1;

    // The script gets the public observation contract, not World/runtime internals.
    assert.equal(Object.isFrozen(observation), true);
    assert.equal("randomState" in observation, false);
    assert.equal("foes" in observation, false);
    assert.equal("shots" in observation, false);
    assert.equal("pendingEvents" in observation, false);
    assert.equal("actionCauses" in observation, false);

    return oakCircuitMission(observation);
  });

  const runtime = new OakRuntime({ seed });
  runtime.register(controller, "player", "nearby");

  runtime.submit("human:1", {
    actorId: runtime.state.player.id,
    type: "BEGIN_RUN",
    params: {
      characterId: "brick",
      options: {
        mate: true,
        partnerId: "mara",
        partnerBot: true,
      },
    },
  });
  runtime.submit("human:1", {
    actorId: runtime.state.player.id,
    type: "TRANSFER_AUTHORITY",
    params: {
      to: controller.id,
      capabilities: ["movement", "combat", "navigation", "inventory"],
    },
  });

  return { runtime, observations: () => observations };
}

test("ScriptController crosses Oak's gated route using bounded observations only", () => {
  const { runtime, observations } = makeMission();

  const maxTicks = 14_000;
  while (
    runtime.tick < maxTicks &&
    runtime.state.player.alive &&
    runtime.state.room !== "sanctum"
  )
    runtime.advance();

  assert.equal(runtime.state.player.alive, true);
  assert.equal(runtime.state.room, "sanctum");
  assert.ok(observations() > 100);

  for (const gear of REQUIRED_GEAR)
    assert.ok(runtime.state.player.gear.includes(gear as never), `missing ${gear}`);

  const scriptEvents = runtime.events.filter(
    (event) => event.controllerId === "script:oak-circuit",
  );
  const rejected = scriptEvents.filter((event) => event.type === "ACTION_REJECTED");
  assert.deepEqual(
    rejected.map((event) => ({
      reason: event.payload.reason,
      action: event.payload.actionType,
      tick: event.tick,
    })),
    [],
  );

  assert.ok(
    scriptEvents.some(
      (event) =>
        event.type === "ACTION_ACCEPTED" &&
        (event.payload.action as { type?: string } | undefined)?.type === "ATTACK_LIGHT",
    ),
    "mission should exercise governed combat",
  );
  assert.ok(
    runtime.events.some(
      (event) =>
        event.type === "ACTOR_DEFEATED" &&
        event.controllerId === "script:oak-circuit",
    ),
    "script should defeat at least one actor through governed combat",
  );

  const rooms = new Set(
    runtime.events
      .filter((event) => event.type === "ACTOR_ENTERED_ROOM")
      .map((event) => event.payload.room),
  );
  for (const room of [
    "oak",
    "pier",
    "roof",
    "mall",
    "school",
    "vent",
    "court",
    "gym",
    "circuit",
    "sanctum",
  ])
    assert.ok(rooms.has(room), `mission never entered ${room}`);

  // Non-human controllers never inherit purchase/session/authority privilege.
  const authority = runtime.authority[runtime.state.player.id];
  assert.deepEqual(authority.movement, ["script:oak-circuit"]);
  assert.deepEqual(authority.combat, ["script:oak-circuit"]);
  assert.deepEqual(authority.navigation, ["script:oak-circuit"]);
  assert.deepEqual(authority.inventory, ["script:oak-circuit"]);
  assert.deepEqual(authority.purchases, ["human:1"]);
  assert.deepEqual(authority.authority, ["human:1"]);
  assert.deepEqual(authority.session, ["human:1"]);
});

test("script-authored run replays exactly without executing the script provider", () => {
  const { runtime } = makeMission(8128);

  const maxTicks = 14_000;
  while (
    runtime.tick < maxTicks &&
    runtime.state.player.alive &&
    runtime.state.room !== "sanctum"
  )
    runtime.advance();

  assert.equal(runtime.state.room, "sanctum");

  const recording = JSON.parse(JSON.stringify(runtime.recording()));
  const scriptedRoots = recording.frames
    .flatMap((frame: { roots: Array<{ controllerId: string }> }) => frame.roots)
    .filter((root: { controllerId: string }) => root.controllerId === "script:oak-circuit");

  assert.ok(scriptedRoots.length > 100);

  // Replay restores external controllers as inert buffered ports and consumes
  // only their already-resolved roots. The script program is not called again.
  const again = replay(recording);
  assert.equal(again.hash(), runtime.hash());
  assert.deepEqual(again.snapshot(), runtime.snapshot());
});
