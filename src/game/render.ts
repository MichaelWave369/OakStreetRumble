import { CLANS, GEAR, ROOMS, SHOPS, roomById, type Palette } from "./content.ts";
import {
  BOT,
  TOP,
  VW,
  VH,
  type Actor,
  type Player,
  type Pose,
  type World,
  nearestShop,
} from "./engine.ts";

function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function drawWorld(ctx: CanvasRenderingContext2D, w: Readonly<World>) {
  const room = roomById(w.room);
  const shakeX = Math.sin(w.time * 73) * w.shake;
  const shakeY = Math.cos(w.time * 91) * w.shake * 0.45;
  const pan = (w.player?.x ?? 200) * 0.08;

  ctx.clearRect(0, 0, VW, VH);
  ctx.save();
  ctx.translate(shakeX, shakeY);

  px(ctx, 0, 0, VW, VH, room.sky);
  px(ctx, 0, 0, VW, 94, "rgba(18,21,28,.28)");
  drawSkyline(ctx, w.time, pan);
  px(ctx, 0, 200, VW, 68, "#6b5344");

  const hot = nearestShop(w as World)?.id;
  for (const shop of w.shops) drawShop(ctx, shop.x, shop.id, room.trim, hot === shop.id);

  px(ctx, 0, TOP, VW, BOT - TOP + 16, room.walk);
  px(ctx, 0, 455, VW, VH - 455, room.road);
  for (let i = 0; i < 12; i++)
    px(ctx, 30 + i * 96 - ((pan * 1.4) % 96), 492, 40, 6, "#e6d36a");

  drawStreetLights(ctx, pan);
  for (const exit of room.exits)
    drawExit(ctx, exit.dir, !!exit.need && !w.player.gear.includes(exit.need));

  if (room.gear && !w.taken.includes(room.gear)) {
    px(ctx, 496, 318, 36, 28, "#8a5a32");
    px(ctx, 492, 312, 44, 8, "#e8b84a");
    ctx.fillStyle = "#f6efe2";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(GEAR[room.gear].name, 514, 306);
  }

  if (w.player.gear.includes("wire"))
    for (const foe of w.foes) if (foe.alive) drawCone(ctx, foe);

  if (w.smoke > 0) {
    ctx.fillStyle = `rgba(190,196,204,${Math.min(.48, w.smoke / 4)})`;
    ctx.fillRect(0, TOP - 20, VW, BOT - TOP + 40);
  }

  const layers: Array<{ y: number; draw: () => void }> = [];
  for (const foe of w.foes) {
    if (!foe.alive) continue;
    layers.push({
      y: foe.y,
      draw: () => {
        drawFighter(ctx, foe.x, foe.y, foe.z, foe.face, foe.state, foePalette(foe), foe.scale, w.time, foe.boss);
        bar(ctx, foe.x - 18, foe.y - (foe.boss ? 132 : 100) - foe.z, 36, foe.hp, foe.maxHp, "#d4543c");
        if (foe.boss || foe.agent) {
          ctx.fillStyle = foe.agent && !foe.boss ? "#7fd0c8" : "#f6efe2";
          ctx.font = "14px Impact, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${foe.title} ${foe.name}`.toUpperCase(), foe.x, foe.y - 82 - foe.z);
        }
      },
    });
  }

  for (const player of [w.player, w.partner, w.mate, w.rival]) {
    if (!player?.alive) continue;
    layers.push({
      y: player.y,
      draw: () => {
        if (player.inv > 0 && Math.floor(w.time * 18) % 2 === 0 && w.phase === "play") return;
        if (player.hiding) {
          px(ctx, player.x - 16, player.y - 22, 32, 22, "#8a5a32");
          px(ctx, player.x - 18, player.y - 28, 36, 8, "#c4a574");
        } else {
          drawFighter(
            ctx,
            player.x,
            player.y,
            player.z,
            player.face,
            player.state,
            playerPalette(player),
            player.scale * (player.callsign === "AGENT" ? 0.92 : 1),
            w.time,
            false,
          );
        }
        if (player.callsign) {
          ctx.fillStyle =
            player.callsign === "RIVAL" ? "#d4543c" : player.callsign === "AGENT" ? "#7fd0c8" : "#e8b84a";
          ctx.font = "12px Impact, sans-serif";
          ctx.textAlign = "center";
          const tag =
            player.callsign === "AGENT" ? "WREN" : player.callsign === "RIVAL" ? "SABLE" : player.name.toUpperCase();
          ctx.fillText(tag, player.x, player.y - 108 - player.z);
        }
      },
    });
  }

  layers.sort((a, b) => a.y - b.y);
  for (const layer of layers) layer.draw();

  for (const drop of w.drops) {
    if (drop.kind === "cash") {
      ctx.fillStyle = "#e8b84a";
      ctx.beginPath();
      ctx.arc(drop.x, drop.y - 6, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (drop.kind === "pipe") {
      px(ctx, drop.x - 8, drop.y - 8, 16, 4, "#c4b49a");
    } else {
      px(ctx, drop.x - 5, drop.y - 10, 10, 8, "#d4543c");
    }
  }

  for (const shot of w.shots) {
    ctx.fillStyle = shot.friendly ? "#7fd0c8" : "#e8b84a";
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const floater of w.floaters) {
    ctx.globalAlpha = Math.max(0, floater.life);
    ctx.fillStyle = floater.good ? "#e8b84a" : "#f6efe2";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(floater.text, floater.x, floater.y);
    ctx.globalAlpha = 1;
  }

  if (["play", "shop", "cleared"].includes(w.phase)) drawHud(ctx, w);
  ctx.restore();
}

function drawSkyline(ctx: CanvasRenderingContext2D, time: number, pan: number) {
  for (let i = 0; i < 12; i++) {
    const height = 70 + ((i * 47) % 90);
    const x = i * 100 - 40 - (pan % 100);
    px(ctx, x, 200 - height, 78, height, i % 2 ? "#243044" : "#1c2838");
    for (let wy = 0; wy < 4; wy++)
      for (let wx = 0; wx < 3; wx++) {
        const lit = (i + wy + wx + Math.floor(time * 2)) % 3 !== 0;
        px(ctx, x + 10 + wx * 20, 208 - height + wy * 16, 10, 8, lit ? "#f2d48a" : "#8fb4d4");
      }
  }
}
function drawStreetLights(ctx: CanvasRenderingContext2D, pan: number) {
  for (let i = 0; i < 5; i++) {
    const x = 80 + i * 190 - ((pan * 0.3) % 190);
    px(ctx, x, 168, 6, 100, "#2a3038");
    const glow = ctx.createRadialGradient(x + 3, 168, 4, x + 3, 188, 70);
    glow.addColorStop(0, "rgba(242,212,138,.55)");
    glow.addColorStop(1, "rgba(242,212,138,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x + 3, 176, 70, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawShop(ctx: CanvasRenderingContext2D, x: number, id: keyof typeof SHOPS, trim: string, hot: boolean) {
  const shop = SHOPS[id];
  px(ctx, x - 36, 132, 72, 78, "#2c333c");
  px(ctx, x - 36, 124, 72, 12, hot ? "#e8b84a" : trim);
  px(ctx, x - 28, 146, 22, 26, "#9fd0e0");
  px(ctx, x + 4, 160, 18, 50, "#14181f");
  ctx.fillStyle = "#f6efe2";
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(shop.name, x, 120);
  ctx.fillStyle = "#e8b84a";
  ctx.fillText(`$${shop.price}`, x, 206);
}
function playerPalette(p: Player): Palette {
  if (p.charId === "mara") return { skin:"#d7a07a",hair:"#1a1a1a",shirt:"#d4543c",pants:"#241820",shoe:"#111",accent:"#f6efe2" };
  if (p.charId === "brick") return { skin:"#c48a62",hair:"#3a2a22",shirt:"#8a3d3d",pants:"#2a241c",shoe:"#111",accent:"#e8b84a" };
  if (p.charId === "nia") return { skin:"#e8c3a0",hair:"#6b3fa0",shirt:"#2a2140",pants:"#16141e",shoe:"#111",accent:"#7fd0c8" };
  return { skin:"#e0b48a",hair:"#2a2118",shirt:"#204060",pants:"#1c2430",shoe:"#111",accent:"#e8b84a" };
}
function foePalette(f: Actor): Palette {
  return { skin:"#e0b090",hair:f.boss?"#1a120c":"#241c16",shirt:CLANS[f.clan].shirt,pants:"#1e2430",shoe:"#111",accent:f.boss?"#e8b84a":"#f6efe2" };
}
export function drawFighter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  z: number,
  face: 1 | -1,
  pose: Pose,
  pal: Palette,
  scale: number,
  time: number,
  boss: boolean,
) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 12 * scale * .55, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y - z);
  ctx.scale(face * scale, scale);
  const bob = pose === "walk" ? Math.sin(time * 10) * 1.2 : 0;
  const arm = ["punch","special","attack"].includes(pose) ? 12 : pose === "block" ? 4 : 7;
  px(ctx, -6, -18 + bob, 4, 12, pal.pants);
  px(ctx, 1, -18 + bob, 4, 12, pal.pants);
  px(ctx, -6, -8 + bob, 4, 3, pal.shoe);
  px(ctx, 1, -8 + bob, 4, 3, pal.shoe);
  if (pose === "kick") px(ctx, 4, -16 + bob, 12, 4, pal.pants);
  px(ctx, -7, -32 + bob, 14, 15, pal.shirt);
  px(ctx, arm, -28 + bob, 6, 4, pal.skin);
  px(ctx, -5, -43 + bob, 10, 11, pal.skin);
  px(ctx, -5, -45 + bob, 10, 4, pal.hair);
  px(ctx, 2, -39 + bob, 2, 2, "#1b1b1b");
  if (boss) px(ctx, -7, -48 + bob, 14, 3, pal.accent);
  if (pose === "block") px(ctx, 3, -30 + bob, 3, 10, pal.skin);
  ctx.restore();
}
function bar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, hp: number, max: number, color: string) {
  px(ctx, x, y, width, 5, "rgba(0,0,0,.55)");
  px(ctx, x, y, Math.max(0, (width * hp) / Math.max(1, max)), 5, color);
}
function drawHud(ctx: CanvasRenderingContext2D, w: Readonly<World>) {
  const p = w.player;
  const room = roomById(w.room);
  px(ctx, 0, 0, VW, 36, "rgba(18,21,28,.76)");
  ctx.fillStyle = "#f6efe2";
  ctx.font = "18px Impact, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${room.name} · ${room.clanName}`.toUpperCase(), 16, 24);
  ctx.textAlign = "right";
  ctx.fillStyle = "#e8b84a";
  ctx.font = "16px system-ui";
  ctx.fillText(`$${p.cash}   PWR ${p.pwr}   AGI ${p.agi}`, VW - 16, 24);

  px(ctx, 0, VH - 48, VW, 48, "rgba(18,21,28,.86)");
  ctx.textAlign = "left";
  ctx.fillStyle = "#a7b0be";
  ctx.font = "12px system-ui";
  ctx.fillText("HP", 16, VH - 30);
  bar(ctx, 40, VH - 38, 140, p.hp, p.maxHp, "#d4543c");
  ctx.fillStyle = "#f6efe2";
  ctx.fillText(`${p.hp}/${p.maxHp}`, 186, VH - 30);
  ctx.fillStyle = "#a7b0be";
  ctx.fillText("SP", 250, VH - 30);
  bar(ctx, 272, VH - 38, 90, p.meter, 100, "#e8b84a");
  ctx.fillText("ALR", 376, VH - 30);
  const alert = w.alert > 70 ? "#d4543c" : w.alert > 30 ? "#e8b84a" : "#7fd0c8";
  bar(ctx, 408, VH - 38, 90, w.alert, 100, alert);
  ctx.fillStyle = "#f6efe2";
  ctx.fillText(p.gear.map((id) => GEAR[id].name.split(" ")[0]).join(" "), 510, VH - 30);
  ctx.fillStyle = alert;
  ctx.font = "14px Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(w.alert > 70 ? "EVASION" : w.alert > 28 ? "CAUTION" : "HIDDEN", VW / 2, 24);
  if (w.bannerT > 0) {
    ctx.fillStyle = "#f6efe2";
    ctx.font = "18px Impact, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(w.banner.toUpperCase(), 16, 58);
  }
  if (p.gear.includes("wire")) drawRadar(ctx, w);
}
function drawExit(ctx: CanvasRenderingContext2D, dir: string, locked: boolean) {
  ctx.fillStyle = locked ? "#d4543c" : "#e8b84a";
  ctx.font = "13px Impact, sans-serif";
  ctx.textAlign = "center";
  const label = locked ? "LOCKED" : dir.toUpperCase();
  if (dir === "left") ctx.fillText(label, 48, 250);
  if (dir === "right") ctx.fillText(label, VW - 48, 250);
  if (dir === "up") ctx.fillText(label, VW / 2, 230);
  if (dir === "down") ctx.fillText(label, VW / 2, BOT - 8);
}
function drawCone(ctx: CanvasRenderingContext2D, foe: Actor) {
  ctx.save();
  ctx.translate(foe.x, foe.y - 20);
  ctx.fillStyle = "rgba(232,184,74,.18)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  const reach = foe.boss ? 200 : 150;
  ctx.lineTo(foe.face * reach, -28);
  ctx.lineTo(foe.face * reach, 28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawRadar(ctx: CanvasRenderingContext2D, w: Readonly<World>) {
  px(ctx, VW - 168, 46, 150, 120, "rgba(18,21,28,.74)");
  ctx.strokeStyle = "#2e384c";
  ctx.strokeRect(VW - 168, 46, 150, 120);
  for (const room of ROOMS) {
    if (!w.visited.includes(room.id)) continue;
    const x = VW - 156 + room.col * 28;
    const y = 58 + room.row * 18;
    px(ctx, x, y, 18, 12, room.id === w.room ? "#e8b84a" : "#3d4a62");
  }
}
