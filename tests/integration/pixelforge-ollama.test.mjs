import assert from "node:assert/strict";
import test from "node:test";

import {
  RuntimeHostV1,
  createModelPolicyClientV1,
  createOllamaProviderV1,
} from "parallax-pixelforge/runtime";
import { createOakPixelForgeBridge } from "../../src/pixelforge/bridge-v1.ts";

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return structuredClone(payload);
    },
  };
}

function acceptedAction(events, type, controllerId) {
  return events.find(
    (event) =>
      event.type === "ACTION_ACCEPTED" &&
      event.controllerId === controllerId &&
      event.payload?.actionType === type,
  );
}

test("PixelForge Ollama model policy controls Oak through bounded observation and governed authority", async () => {
  const fetchCalls = [];

  const provider = createOllamaProviderV1({
    model: "oak-fixture-model",
    fetchImpl: async (url, init) => {
      const body = JSON.parse(init.body);
      const request = JSON.parse(body.messages[1].content);
      fetchCalls.push({ url, body, request });

      const observation = request.observation;
      assert.equal(observation.self.id, "player:reed");
      assert.equal(observation.room, "oak");
      assert.ok(observation.allowedActions.includes("MOVE"));
      assert.equal("randomState" in observation, false);
      assert.equal("pendingEvents" in observation, false);
      assert.equal("actionCauses" in observation, false);

      return jsonResponse({
        model: "oak-fixture-model",
        done: true,
        message: {
          role: "assistant",
          content: JSON.stringify({
            schema: "pixelforge/model-policy-response/1",
            intents: [
              {
                actorId: observation.self.id,
                type: "MOVE",
                params: { x: 1, y: 0 },
                correlationId: "oak-model-move-1",
              },
            ],
          }),
        },
      });
    },
  });

  const model = createModelPolicyClientV1({
    id: "model:ollama-oak",
    provider,
    binding: "player",
    profile: "nearby",
    maxIntentsPerTurn: 1,
    instructions: [
      "Control only the observed Oak actor.",
      "Return exactly one valid MOVE intent.",
      "Move right with x=1 and y=0.",
    ].join(" "),
  });

  const host = new RuntimeHostV1(
    createOakPixelForgeBridge({ seed: 369 }),
  );

  host.attachClient(model);

  const preAuthority = host.observe("model:ollama-oak");
  assert.deepEqual(preAuthority.allowedActions, []);

  host.submit("human:1", {
    actorId: "player:reed",
    type: "BEGIN_RUN",
    params: { characterId: "reed" },
  });
  const beginCycle = host.advance();
  assert.ok(acceptedAction(beginCycle.events, "BEGIN_RUN", "human:1"));

  host.submit("human:1", {
    actorId: "player:reed",
    type: "TRANSFER_AUTHORITY",
    params: {
      to: "model:ollama-oak",
      capabilities: ["movement"],
    },
  });
  const delegationCycle = host.advance();
  assert.ok(
    acceptedAction(
      delegationCycle.events,
      "TRANSFER_AUTHORITY",
      "human:1",
    ),
  );

  const delegated = host.observe("model:ollama-oak");
  assert.ok(delegated.allowedActions.includes("MOVE"));
  assert.equal(delegated.allowedActions.includes("ATTACK_LIGHT"), false);
  assert.equal(delegated.allowedActions.includes("BUY"), false);
  assert.equal(delegated.allowedActions.includes("TRANSFER_AUTHORITY"), false);

  const startX = delegated.self.x;
  const turn = await host.turn("model:ollama-oak");

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, "http://127.0.0.1:11434/api/chat");
  assert.equal(turn.intents.length, 1);
  assert.equal(turn.intents[0].type, "MOVE");
  assert.ok(host.observe("model:ollama-oak").self.x > startX);

  const acceptedMove = acceptedAction(
    turn.cycle.events,
    "MOVE",
    "model:ollama-oak",
  );
  assert.ok(acceptedMove);
  assert.equal(acceptedMove.correlationId, "oak-model-move-1");

  const grants = host.authority()["player:reed"];
  assert.deepEqual(grants.movement, ["model:ollama-oak"]);
  assert.deepEqual(grants.combat, ["human:1"]);
  assert.deepEqual(grants.navigation, ["human:1"]);
  assert.deepEqual(grants.inventory, ["human:1"]);
  assert.deepEqual(grants.purchases, ["human:1"]);
  assert.deepEqual(grants.authority, ["human:1"]);
  assert.deepEqual(grants.session, ["human:1"]);

  const modelReceipts = model.modelReceipts();
  assert.ok(modelReceipts.some((receipt) => receipt.type === "MODEL_REQUEST_BUILT"));
  assert.ok(modelReceipts.some((receipt) => receipt.type === "MODEL_PROVIDER_COMPLETED"));
  assert.ok(modelReceipts.some((receipt) => receipt.type === "MODEL_INTENTS_PARSED"));

  const hostReceipts = host.receipts();
  assert.ok(hostReceipts.some((receipt) => receipt.type === "OBSERVATION_READ"));
  assert.ok(hostReceipts.some((receipt) => receipt.type === "INTENT_QUEUED"));
  assert.ok(hostReceipts.some((receipt) => receipt.type === "CLIENT_TURN_COMPLETED"));

  const recording = host.recording();
  const modelRoots = recording.frames
    .flatMap((frame) => frame.roots)
    .filter((root) => root.controllerId === "model:ollama-oak");
  assert.equal(modelRoots.length, 1);
  assert.equal(modelRoots[0].intent.correlationId, "oak-model-move-1");
});

test("malformed Ollama model output cannot mutate Oak", async () => {
  const provider = createOllamaProviderV1({
    model: "oak-bad-model",
    fetchImpl: async () =>
      jsonResponse({
        model: "oak-bad-model",
        done: true,
        message: {
          role: "assistant",
          content: "MOVE RIGHT PLEASE",
        },
      }),
  });

  const model = createModelPolicyClientV1({
    id: "model:ollama-bad",
    provider,
    binding: "player",
    profile: "nearby",
  });

  const host = new RuntimeHostV1(createOakPixelForgeBridge({ seed: 369 }));
  host.attachClient(model);

  host.submit("human:1", {
    actorId: "player:reed",
    type: "BEGIN_RUN",
    params: { characterId: "reed" },
  });
  host.advance();

  host.submit("human:1", {
    actorId: "player:reed",
    type: "TRANSFER_AUTHORITY",
    params: {
      to: "model:ollama-bad",
      capabilities: ["movement"],
    },
  });
  host.advance();

  const before = host.snapshot();

  await assert.rejects(
    () => host.turn("model:ollama-bad"),
    /valid JSON|JSON object/i,
  );

  const after = host.snapshot();
  assert.equal(after.world.player.x, before.world.player.x);
  assert.equal(after.world.player.y, before.world.player.y);

  const newEvents = host.pollEvents();
  assert.equal(
    newEvents.some((event) => event.controllerId === "model:ollama-bad"),
    false,
  );

  assert.ok(
    model
      .modelReceipts()
      .some((receipt) => receipt.type === "MODEL_TURN_FAILED"),
  );
});
