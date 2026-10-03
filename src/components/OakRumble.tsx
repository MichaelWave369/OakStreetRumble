import { useEffect, useRef, useState, type ReactNode } from "react";
import { CHARACTERS, CLANS, GEAR, ROOMS, SHOPS, roomById } from "../game/content.ts";
import { VW, type Phase, type World } from "../game/engine.ts";
import { loadMeta, saveMeta } from "../game/meta-storage.ts";
import { BrowserCheckpointStore, browserStorage } from "../game/browser-persistence.ts";
import { KeyboardController, KeyboardDevice } from "../game/controllers.ts";
import { drawWorld } from "../game/render.ts";
import { OakRuntime, type RuntimeSnapshot } from "../game/runtime.ts";
import { TICK_SECONDS } from "../game/rules.ts";
import { cue, startMusic, stopMusic, tone, unlockAudio } from "../game/sfx.ts";
import type { ActionIntent, ActionParams, ActionType } from "../game/actions.ts";

declare global {
  interface Window {
    __oak?: {
      getTick: () => number;
      getPhase: () => Phase;
      getRoom: () => string;
      getX: () => number;
      getHash: () => string;
      setKeys: (codes: string[]) => void;
    };
  }
}

export function OakRumble() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<OakRuntime | null>(null);
  const worldRef = useRef<Readonly<World> | null>(null);
  const keysRef = useRef(new KeyboardDevice());
  const resumeRef = useRef<RuntimeSnapshot | null>(null);
  const phaseRef = useRef<Phase>("title");

  const [phase, setPhase] = useState<Phase>("title");
  const [world, setWorld] = useState<Readonly<World> | null>(null);
  const [picked, setPicked] = useState("reed");
  const [best, setBest] = useState(0);
  const [note, setNote] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [canResume, setCanResume] = useState(false);
  const [withWren, setWithWren] = useState(true);
  const [partnerPick, setPartnerPick] = useState("");
  const [autoNight, setAutoNight] = useState(false);
  const storeRef = useRef(new BrowserCheckpointStore());

  function attach(runtime: OakRuntime) {
    runtime.register(new KeyboardController("human:1", keysRef.current), "player", "room");
    runtime.register(new KeyboardController("human:2", keysRef.current, 2), "partner", "room");
    runtimeRef.current = runtime;
    worldRef.current = runtime.state;
    setWorld(runtime.state);
  }

  useEffect(() => {
    const storage = browserStorage();
    const runtime = new OakRuntime({ meta: storage ? loadMeta(storage) : undefined });
    attach(runtime);
    setPicked(runtime.state.picked);
    setBest(runtime.state.best);

    const loaded = storeRef.current.load();
    resumeRef.current = loaded.snapshot;
    setCanResume(Boolean(loaded.snapshot));
    if (loaded.error) setSaveNote("Saved run could not be restored.");

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(2, Math.round(rect.width * dpr));
      canvas.height = Math.max(2, Math.round(rect.width * 9 / 16 * dpr));
      ctx.setTransform(canvas.width / VW, 0, 0, canvas.height / (VW * 0.5625), 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    fit();
    const resize = new ResizeObserver(fit);
    resize.observe(canvas);

    const keys = keysRef.current;
    const onDown = (event: KeyboardEvent) => {
      unlockAudio();
      if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyM"].includes(event.code))
        event.preventDefault();
      keys.down(event.code);
    };
    const onUp = (event: KeyboardEvent) => keys.up(event.code);
    const clear = () => keys.clear();

    const checkpoint = () => {
      const current = runtimeRef.current;
      if (!current || ["title","select","story"].includes(current.state.phase)) return;
      const snapshot = current.snapshot();
      const result = storeRef.current.save(snapshot);
      if (storage) saveMeta(storage, current.state);
      if (result.ok) {
        resumeRef.current = snapshot;
        setCanResume(true);
        setSaveNote("");
      } else {
        setSaveNote(result.error || "This run could not be saved.");
      }
    };

    window.addEventListener("keydown", onDown, { passive: false });
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    window.addEventListener("pagehide", checkpoint);

    const visibility = () => {
      if (document.hidden) {
        keys.clear();
        checkpoint();
      }
    };
    document.addEventListener("visibilitychange", visibility);

    window.__oak = {
      getTick: () => runtimeRef.current?.tick || 0,
      getPhase: () => worldRef.current?.phase || "title",
      getRoom: () => worldRef.current?.room || "oak",
      getX: () => worldRef.current?.player.x || 0,
      getHash: () => runtimeRef.current?.hash() || "",
      setKeys: (codes) => keys.setKeys(codes),
    };

    const checkpointEvents = new Set([
      "ACTOR_ENTERED_ROOM","ACTOR_DEFEATED","ITEM_ACQUIRED","PURCHASE_COMPLETED",
      "AUTHORITY_TRANSFERRED","AGENT_JOINED","AGENT_LEFT",
    ]);

    let mounted = true;
    let last = performance.now();
    let accumulator = 0;
    let raf = 0;

    const loop = (now: number) => {
      const current = runtimeRef.current;
      if (!current) return;
      accumulator += Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      let changed = false;
      let needsSave = false;

      while (accumulator >= TICK_SECONDS) {
        const before = current.state;
        const events = current.advance();
        const after = current.state;
        worldRef.current = after;

        if (after.player.hp < before.player.hp) cue("hurt");
        if (before.alert < 70 && after.alert >= 70) cue("alert");
        if (events.some((event) => event.type === "ITEM_ACQUIRED")) cue("pickup");
        if (events.some((event) => event.type === "PURCHASE_COMPLETED"))
          tone(330, 0.07, "square", 0.05);

        for (const event of events) {
          if (checkpointEvents.has(event.type)) needsSave = true;
          if (event.type === "ACTION_REJECTED" && event.payload.actionType === "BUY")
            setNote(event.payload.reason === "INSUFFICIENT_CASH" ? "You need more cash." : "Purchase unavailable.");
        }

        if (after.phase !== phaseRef.current) {
          phaseRef.current = after.phase;
          setPhase(after.phase);
          setNote("");
          needsSave = true;
        }

        if (current.tick % 300 === 0) needsSave = true;
        changed = true;
        accumulator -= TICK_SECONDS;
      }

      if (needsSave) checkpoint();
      if (changed && mounted) {
        setWorld(worldRef.current);
        setBest(worldRef.current?.best || 0);
      }
      if (worldRef.current) drawWorld(ctx, worldRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      checkpoint();
      mounted = false;
      cancelAnimationFrame(raf);
      resize.disconnect();
      stopMusic();
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
      window.removeEventListener("pagehide", checkpoint);
      document.removeEventListener("visibilitychange", visibility);
      delete window.__oak;
    };
  }, []);

  function submit<K extends ActionType>(type: K, params: ActionParams[K]) {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    runtime.submit("human:1", {
      actorId: runtime.state.player.id,
      type,
      params,
    } as ActionIntent);
  }

  function go(next: Phase) {
    if (["title","select","story"].includes(next)) stopMusic();
    submit("SET_PHASE", { phase: next });
    keysRef.current.clear();
  }

  function startFight(kind: "story" | "auto" | "duel" = "story") {
    unlockAudio();
    cue("ui");
    startMusic();
    const bot = partnerPick.startsWith("bot:");
    const partnerId = (bot ? partnerPick.slice(4) : partnerPick) || undefined;
    const options = kind === "duel"
      ? { duel: true }
      : {
          auto: kind === "auto" || autoNight,
          mate: withWren || kind === "auto",
          ...(partnerId ? { partnerId } : {}),
          partnerBot: bot || kind === "auto",
        };
    submit("BEGIN_RUN", { characterId: picked, options });
    keysRef.current.clear();
  }

  function resume() {
    if (!resumeRef.current) return;
    try {
      keysRef.current.clear();
      const runtime = new OakRuntime({ snapshot: resumeRef.current });
      attach(runtime);
      phaseRef.current = runtime.state.phase;
      setPhase(runtime.state.phase);
      setPicked(runtime.state.picked);
      setBest(runtime.state.best);
      unlockAudio();
      startMusic();
    } catch {
      storeRef.current.clear();
      resumeRef.current = null;
      setCanResume(false);
      setSaveNote("Old checkpoint cleared after runtime upgrade.");
    }
  }

  function exportReplay() {
    const runtime = runtimeRef.current;
    if (!runtime) return;
    const blob = new Blob([JSON.stringify(runtime.recording(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Oak-Street-Rumble-replay.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const active = CHARACTERS.find((c) => c.id === picked) || CHARACTERS[0];
  const room = roomById(world?.room || "oak");
  const shop = world?.shopId ? SHOPS[world.shopId] : null;

  return (
    <main className="app">
      <div className="shell">
        <div className="stage">
          <canvas ref={canvasRef} />

          {phase === "title" && (
            <Overlay>
              <p className="kicker">Agent-native street brawler</p>
              <h1>OAK STREET RUMBLE</h1>
              <p className="muted">Four crews. Wren on the wire. A second player on the arrows. One governed runtime underneath everybody.</p>
              <p className="wire">Rooms visited best: {best} / {ROOMS.length}</p>
              <div className="row">
                {canResume && <button className="primary" onClick={resume}>Continue the night</button>}
                <button className="primary" onClick={() => go("story")}>Start the night</button>
                <button onClick={() => { setAutoNight(true); setWithWren(true); go("select"); }}>Agent night</button>
                <button onClick={() => startFight("duel")}>Watch a duel</button>
              </div>
            </Overlay>
          )}

          {phase === "story" && (
            <Overlay wide>
              <p className="kicker">The night before the street</p>
              <h2>Four crews, one wire</h2>
              <div className="log">
                {CHARACTERS.map((c) => (
                  <p key={c.id}><strong>{c.name}</strong><span className="muted"> · {CLANS[c.clan].name}. {c.tie}</span></p>
                ))}
              </div>
              <button className="primary" onClick={() => go("select")}>Choose a fighter</button>
            </Overlay>
          )}

          {phase === "select" && (
            <Overlay wide>
              <p className="kicker">Crew select</p>
              <h2>Choose a fighter</h2>
              <div className="character-grid">
                {CHARACTERS.map((c) => (
                  <button key={c.id} className={"character " + (picked === c.id ? "active" : "")} onClick={() => setPicked(c.id)}>
                    <strong>{c.name}</strong>
                    <span className="wire">{c.aka} · {c.specialName}</span>
                    <small>{c.blurb}</small>
                    <small>HP {c.hp} · PWR {c.pwr} · AGI {c.agi}</small>
                  </button>
                ))}
              </div>
              <div className="stack" style={{ marginTop: 14 }}>
                <label>
                  Partner{" "}
                  <select value={partnerPick} onChange={(e) => setPartnerPick(e.target.value)}>
                    <option value="">Solo</option>
                    {CHARACTERS.filter((c) => c.id !== picked).map((c) => <option key={c.id} value={c.id}>{c.name} on arrows</option>)}
                    {CHARACTERS.filter((c) => c.id !== picked).map((c) => <option key={"bot-" + c.id} value={"bot:" + c.id}>{c.name} as bot</option>)}
                  </select>
                </label>
                <label><input type="checkbox" checked={withWren} onChange={(e) => setWithWren(e.target.checked)} /> Wren on the wire</label>
                <label><input type="checkbox" checked={autoNight} onChange={(e) => setAutoNight(e.target.checked)} /> Agents drive the lead fighter</label>
                <p className="muted">{active.name}: {active.specialName}. {active.passive}</p>
                <div className="row">
                  <button className="primary" onClick={() => startFight(autoNight ? "auto" : "story")}>{autoNight ? "Let them run" : "Take the street"}</button>
                  <button onClick={() => go("title")}>Back</button>
                </div>
              </div>
            </Overlay>
          )}

          {phase === "shop" && shop && world && (
            <Overlay>
              <p className="kicker">{shop.name}</p>
              <h2>{shop.blurb}</h2>
              <p className="muted">{"$"}{shop.price} · you have {"$"}{world.player.cash}</p>
              {note && <p className="accent">{note}</p>}
              <div className="row">
                <button className="primary" onClick={() => submit("BUY", { shopId: shop.id })}>Buy</button>
                <button onClick={() => submit("INTERACT", { kind: "close-shop" })}>Leave</button>
              </div>
            </Overlay>
          )}

          {phase === "map" && world && (
            <Overlay wide>
              <p className="kicker">District map</p>
              <h2>{room.name}</h2>
              <div className="map-grid">
                {ROOMS.map((r) => {
                  const seen = world.visited.includes(r.id);
                  const here = world.room === r.id;
                  return (
                    <div key={r.id} className={"room " + (here ? "here" : "")} style={{ gridColumn: r.col + 1, gridRow: r.row + 1 }}>
                      <strong>{seen || here ? r.name : "Unknown"}</strong>
                      {seen && r.boss && <span className="accent">{r.boss.title} {r.boss.name}</span>}
                      {seen && <span>{r.exits.map((ex) => ex.need ? ex.dir + " locked" : ex.dir).join(" · ")}</span>}
                    </div>
                  );
                })}
              </div>
              <p className="muted">Gear: {world.player.gear.length ? world.player.gear.map((id) => GEAR[id].name).join(", ") : "none yet"}{world.auto ? " · agents running" : ""}</p>
              <div className="log">{world.log.slice(-8).map((line, i) => <p key={i}>{line}</p>)}</div>
              <div className="row">
                <button className="primary" onClick={() => go("play")}>Back to the street</button>
                <button onClick={exportReplay}>Save replay</button>
              </div>
            </Overlay>
          )}

          {phase === "win" && <Overlay><p className="kicker">Night circuit down</p><h2>The street is yours</h2><button className="primary" onClick={() => go("select")}>Run it back</button></Overlay>}
          {phase === "lose" && <Overlay><p className="kicker accent">Down for the count</p><h2>{room.name}</h2><div className="row"><button className="primary" onClick={() => submit("RETRY", {})}>Retry block</button><button onClick={() => go("select")}>Switch fighter</button></div></Overlay>}
        </div>

        <div className="touch-grid touch-only">
          <Pad label="Left" code="KeyA" device={keysRef.current} hold />
          <Pad label="Right" code="KeyD" device={keysRef.current} hold />
          <Pad label="Up" code="KeyW" device={keysRef.current} hold />
          <Pad label="Down" code="KeyS" device={keysRef.current} hold />
          <Pad label="Punch" code="KeyJ" device={keysRef.current} />
          <Pad label="Kick" code="KeyK" device={keysRef.current} />
          <Pad label="Jump" code="Space" device={keysRef.current} />
          <Pad label="Special" code="KeyF" device={keysRef.current} />
          <Pad label="Block" code="ShiftLeft" device={keysRef.current} hold />
          <Pad label="Crouch" code="KeyC" device={keysRef.current} hold />
          <Pad label="Star" code="KeyR" device={keysRef.current} />
          <Pad label="Smoke" code="KeyG" device={keysRef.current} />
          <Pad label="Hide" code="KeyQ" device={keysRef.current} hold />
          <Pad label="Shop" code="KeyE" device={keysRef.current} />
          <Pad label="Map" code="KeyM" device={keysRef.current} />
          <Pad label="Handoff" code="KeyH" device={keysRef.current} />
          <Pad label="Wren" code="KeyB" device={keysRef.current} />
          <Pad label="Partner" code="KeyP" device={keysRef.current} />
        </div>

        {saveNote && <p className="save-note" role="status">{saveNote}</p>}
        <p className="desktop-help muted">A/D/W/S move · J/K attack · Space jump · F special · C crouch · H handoff · B Wren · P partner · M map · arrows/U/I/O player two</p>
      </div>
    </main>
  );
}

function Overlay({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className="overlay"><div className={"panel " + (wide ? "wide" : "")}>{children}</div></div>;
}

function Pad({ label, code, device, hold = false }: { label: string; code: string; device: KeyboardDevice; hold?: boolean }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        unlockAudio();
        device.down(code);
      }}
      onPointerUp={() => device.up(code)}
      onPointerLeave={() => device.up(code)}
      onPointerCancel={() => device.up(code)}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={label + (hold ? " hold" : "")}
    >
      {label}
    </button>
  );
}
