import {
  RuntimeHostV1,
  createModelPolicyClientV1,
  createOllamaProviderV1,
} from "parallax-pixelforge/runtime";
import { createOakPixelForgeBridge } from "../src/pixelforge/bridge-v1.ts";

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

const model = arg("model") ?? process.env.OLLAMA_MODEL;
const baseUrl =
  arg("base-url") ??
  process.env.OLLAMA_BASE_URL ??
  "http://127.0.0.1:11434";

if (!model) {
  console.error(
    "Missing Ollama model. Set OLLAMA_MODEL or pass --model=<installed-model>.",
  );
  process.exit(2);
}

const provider = createOllamaProviderV1({
  model,
  baseUrl,
  options: {
    temperature: 0,
  },
});

const controllerId = "model:ollama-oak-live";
const client = createModelPolicyClientV1({
  id: controllerId,
  provider,
  binding: "player",
  profile: "nearby",
  maxIntentsPerTurn: 1,
  instructions: [
    "You are qualifying bounded control of Oak Street Rumble.",
    "Return exactly one MOVE intent and no other intents.",
    "Use the observed self.id as actorId.",
    "Set params to x=1 and y=0 so the actor moves right.",
    "Do not attack, buy, navigate rooms, transfer authority, or invent actions.",
  ].join(" "),
});

const host = new RuntimeHostV1(
  createOakPixelForgeBridge({ seed: 369 }),
);
host.attachClient(client);

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
    to: controllerId,
    capabilities: ["movement"],
  },
});
host.advance();

const observation = host.observe(controllerId);
const startX = observation.self?.x;

if (!Number.isFinite(startX) || !observation.allowedActions.includes("MOVE")) {
  console.error("OAK OLLAMA QUALIFICATION FAIL");
  console.error("Model controller did not receive the expected bounded MOVE authority.");
  process.exit(1);
}

try {
  const report = await host.turn(controllerId);
  const after = host.observe(controllerId);
  const accepted = report.cycle.events.find(
    (event) =>
      event.type === "ACTION_ACCEPTED" &&
      event.controllerId === controllerId &&
      event.payload?.actionType === "MOVE",
  );

  if (!accepted || !(after.self.x > startX)) {
    console.error("OAK OLLAMA QUALIFICATION FAIL");
    console.error(
      JSON.stringify(
        {
          model,
          baseUrl,
          startX,
          finalX: after.self?.x,
          intents: report.intents,
          gameEvents: report.cycle.events,
          modelReceipts: client.modelReceipts(),
          hostStatus: host.status(),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log("OAK OLLAMA QUALIFICATION PASS");
  console.log(
    JSON.stringify(
      {
        model,
        baseUrl,
        room: after.room,
        startX,
        finalX: after.self.x,
        acceptedAction: accepted.payload?.actionType,
        controllerId: accepted.controllerId,
        runtimeHash: host.hash(),
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error("OAK OLLAMA QUALIFICATION FAIL");
  console.error(
    error instanceof Error ? error.stack ?? error.message : String(error),
  );
  process.exit(1);
}
