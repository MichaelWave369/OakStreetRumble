let ctx: AudioContext | null = null;
let musicOn = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let step = 0;

const BASS = [98, 98, 146, 130, 110, 110, 164, 146];
const LEAD = [0, 392, 0, 440, 494, 440, 392, 330];

export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
}
function blip(freq: number, dur: number, type: OscillatorType, gain: number) {
  if (!ctx || freq <= 0) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
export function tone(freq: number, dur = 0.08, type: OscillatorType = "square", gain = 0.05) {
  blip(freq, dur, type, gain);
}
export function startMusic() {
  unlockAudio();
  if (musicOn) return;
  musicOn = true;
  const tick = () => {
    if (!musicOn) return;
    blip(BASS[step % BASS.length] ?? 110, 0.18, "triangle", 0.035);
    const lead = LEAD[step % LEAD.length] ?? 0;
    if (lead) blip(lead, 0.11, "square", 0.012);
    if (step % 8 === 0) blip(49, 0.2, "sine", 0.04);
    step += 1;
    timer = setTimeout(tick, 300);
  };
  tick();
}
export function stopMusic() {
  musicOn = false;
  if (timer) clearTimeout(timer);
  timer = null;
}
export function cue(kind: "hurt" | "alert" | "pickup" | "ui") {
  unlockAudio();
  if (kind === "hurt") {
    blip(140, 0.09, "sawtooth", 0.04);
    blip(70, 0.12, "square", 0.03);
  } else if (kind === "alert") {
    blip(660, 0.08, "square", 0.04);
    blip(440, 0.14, "square", 0.03);
  } else if (kind === "pickup") {
    blip(520, 0.06, "square", 0.04);
    blip(780, 0.08, "square", 0.03);
  } else {
    blip(330, 0.06, "square", 0.04);
  }
}
