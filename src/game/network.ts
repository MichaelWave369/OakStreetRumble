import { record, validIntent } from "./actions.ts";
import type { OakRuntime } from "./runtime.ts";

export type IngressResult = {
  accepted: boolean;
  reason: string;
  controllerId?: string;
  sequence?: number;
};
/** Host-side protocol boundary, not a signaling service or working multiplayer UI.
 * An authenticated transport must bind a peer to a previously registered remote
 * controller. Packets cannot name their own controller or replace world state. */
export class ActionReplicationIngress {
  #peers = new Map<string, { controllerId: string; lastSequence: number }>();
  bind(peerId: string, controllerId: string): void {
    this.#peers.set(peerId, { controllerId, lastSequence: -1 });
  }
  unbind(peerId: string): void {
    this.#peers.delete(peerId);
  }
  receive(peerId: string, packet: unknown, runtime: OakRuntime): IngressResult {
    const peer = this.#peers.get(peerId);
    if (!peer) return { accepted: false, reason: "UNBOUND_PEER" };
    const reject = (reason: string): IngressResult => ({
      accepted: false,
      reason,
      controllerId: peer.controllerId,
    });
    let bytes: number;
    try {
      bytes = new TextEncoder().encode(JSON.stringify(packet)).length;
    } catch {
      return reject("INVALID_PACKET");
    }
    if (bytes > 32768) return reject("PACKET_TOO_LARGE");
    if (
      !record(packet) ||
      !Object.keys(packet).every((k) =>
        ["schemaVersion", "kind", "sequence", "tick", "intents"].includes(k),
      ) ||
      packet.schemaVersion !== 1 ||
      packet.kind !== "actions" ||
      !Number.isSafeInteger(packet.sequence) ||
      Number(packet.sequence) < 0 ||
      !Number.isSafeInteger(packet.tick) ||
      !Array.isArray(packet.intents) ||
      packet.intents.length > 32 ||
      !packet.intents.every(validIntent)
    )
      return reject("INVALID_PACKET");
    if (Number(packet.sequence) <= peer.lastSequence)
      return reject("DUPLICATE_OR_REORDERED_PACKET");
    if (packet.tick !== runtime.tick) return reject("WRONG_TICK");
    peer.lastSequence = Number(packet.sequence);
    for (const intent of packet.intents)
      runtime.submit(peer.controllerId, intent, Number(packet.tick));
    return {
      accepted: true,
      reason: "QUEUED_FOR_AUTHORITY_VALIDATION",
      controllerId: peer.controllerId,
      sequence: peer.lastSequence,
    };
  }
}
export function authoritativeEventBatch(runtime: OakRuntime, since = 0) {
  return {
    schemaVersion: 1 as const,
    kind: "events" as const,
    tick: runtime.tick,
    from: since,
    events: runtime.events.slice(since),
    stateHash: runtime.hash(),
  };
}
