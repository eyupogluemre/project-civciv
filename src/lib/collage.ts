"use client";

import type { Gender, Locale, PartyStats, SanitizedParticipant } from "./types";

export type CollageFormat = "story" | "square";

export interface CollageOptions {
  format: CollageFormat;
  title: string;
  revealedGender: Gender;
  stats: PartyStats;
  participants: SanitizedParticipant[];
  locale: Locale;
  dateIso?: string | null;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function generateMemoryCollageDataUrl(
  options: CollageOptions
): Promise<string> {
  const isStory = options.format === "story";
  const width = isStory ? 1080 : 1440;
  const height = isStory ? 1920 : 1440;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  const isBoy = options.revealedGender === "boy";
  const accentPrimary = isBoy ? "#38bdf8" : "#f472b6";
  const accentSoft = isBoy ? "#87ceeb" : "#ffc0cb";

  // 1. Deep navy-to-purple radial gradient matching boyorgirl.party identity
  const bg = ctx.createRadialGradient(
    width * 0.5,
    height * 0.25,
    60,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.85
  );
  bg.addColorStop(0, "#192344");
  bg.addColorStop(0.55, "#0f1c37");
  bg.addColorStop(1, "#081226");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle reveal halo glow behind header
  const halo = ctx.createRadialGradient(
    width * 0.5,
    isStory ? 290 : 210,
    20,
    width * 0.5,
    isStory ? 290 : 210,
    isStory ? 440 : 480
  );
  halo.addColorStop(0, isBoy ? "rgba(56, 189, 248, 0.24)" : "rgba(244, 114, 182, 0.24)");
  halo.addColorStop(1, "rgba(10, 25, 49, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);

  const padX = isStory ? 64 : 80;
  let cursorY = isStory ? 84 : 64;

  // 2. Brand Header
  ctx.textAlign = "center";
  ctx.font = "700 28px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  const dateStr = options.dateIso
    ? new Date(options.dateIso).toLocaleDateString(
        options.locale === "tr" ? "tr-TR" : "en-US",
        { year: "numeric", month: "long", day: "numeric" }
      )
    : "";
  ctx.fillText(
    dateStr ? `boyorgirl.party  •  ${dateStr}` : "boyorgirl.party",
    width / 2,
    cursorY
  );
  cursorY += isStory ? 68 : 56;

  // 3. Event Title
  ctx.font = `900 ${isStory ? 46 : 44}px 'Archivo Black', Impact, sans-serif`;
  ctx.fillStyle = "#f8fafc";
  const cleanTitle =
    options.title.length > 34
      ? `${options.title.slice(0, 33)}…`
      : options.title;
  ctx.fillText(cleanTitle, width / 2, cursorY);
  cursorY += isStory ? 42 : 34;

  // 4. Big Reveal Banner
  const badgeW = isStory ? 620 : 660;
  const badgeH = isStory ? 112 : 96;
  const badgeX = (width - badgeW) / 2;
  drawRoundedRect(ctx, badgeX, cursorY, badgeW, badgeH, 28);
  const badgeGrad = ctx.createLinearGradient(badgeX, cursorY, badgeX + badgeW, cursorY);
  if (isBoy) {
    badgeGrad.addColorStop(0, "#0284c7");
    badgeGrad.addColorStop(1, "#38bdf8");
  } else {
    badgeGrad.addColorStop(0, "#db2777");
    badgeGrad.addColorStop(1, "#f472b6");
  }
  ctx.fillStyle = badgeGrad;
  ctx.fill();

  const revealText =
    options.locale === "tr"
      ? isBoy
        ? "ERKEK!"
        : "KIZ!"
      : isBoy
        ? "IT'S A BOY!"
        : "IT'S A GIRL!";
  ctx.font = `900 ${isStory ? 54 : 48}px 'Archivo Black', Impact, sans-serif`;
  ctx.fillStyle = "#081226";
  ctx.fillText(revealText, width / 2, cursorY + badgeH * 0.68);
  cursorY += badgeH + (isStory ? 44 : 36);

  // 5. Prediction Percentage Bar
  const barW = width - padX * 2;
  const barH = 34;
  const boyRatio =
    options.stats.total > 0 ? options.stats.boyCount / options.stats.total : 0.5;

  drawRoundedRect(ctx, padX, cursorY, barW, barH, 17);
  ctx.fillStyle = "#1e293b";
  ctx.fill();

  ctx.save();
  drawRoundedRect(ctx, padX, cursorY, barW, barH, 17);
  ctx.clip();
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(padX, cursorY, barW * boyRatio, barH);
  ctx.fillStyle = "#f472b6";
  ctx.fillRect(padX + barW * boyRatio, cursorY, barW * (1 - boyRatio), barH);
  ctx.restore();

  cursorY += barH + 34;
  ctx.font = "700 26px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#87ceeb";
  const boyLabel = options.locale === "tr" ? "Erkek" : "Boy";
  const girlLabel = options.locale === "tr" ? "Kız" : "Girl";
  ctx.fillText(
    `${boyLabel}: %${options.stats.boyPercent} (${options.stats.boyCount})`,
    padX,
    cursorY
  );
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffc0cb";
  ctx.fillText(
    `${girlLabel}: %${options.stats.girlPercent} (${options.stats.girlCount})`,
    width - padX,
    cursorY
  );
  cursorY += isStory ? 44 : 34;

  // 6. Participants Selfie / Avatar Grid
  const footerHeight = 96;
  const gridTop = cursorY;
  const gridHeight = height - gridTop - footerHeight;
  const gridWidth = width - padX * 2;

  const list = options.participants.slice(0, isStory ? 24 : 25);
  const count = Math.max(list.length, 1);

  // Load images in parallel
  const loadedImages = await Promise.all(
    list.map((p) => (p.selfieUrl ? loadImage(p.selfieUrl) : Promise.resolve(null)))
  );

  // Compute balanced grid dimensions
  let cols = isStory ? 3 : 4;
  if (count <= 2) cols = count;
  else if (count <= 4) cols = 2;
  else if (count <= 9) cols = 3;
  else if (count <= 16) cols = 4;
  else cols = isStory ? 4 : 5;

  const rows = Math.max(1, Math.ceil(count / cols));
  const gap = count > 12 ? 18 : 26;
  const cellW = (gridWidth - gap * (cols - 1)) / cols;
  const cellH = (gridHeight - gap * (rows - 1)) / rows;
  const labelSpace = count > 12 ? 32 : 40;
  const tileSize = Math.min(cellW, cellH - labelSpace, isStory ? 260 : 250);

  const actualGridW = cols * cellW + (cols - 1) * gap;
  const actualGridH = rows * (tileSize + labelSpace) + (rows - 1) * gap;
  const startX = (width - actualGridW) / 2;
  const startY = gridTop + Math.max(0, (gridHeight - actualGridH) / 2);

  if (list.length === 0) {
    ctx.textAlign = "center";
    ctx.font = "600 30px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(
      options.locale === "tr"
        ? "Katılımcı fotoğrafları burada görünecek"
        : "Guest selfies & guesses will appear here",
      width / 2,
      gridTop + gridHeight / 2
    );
  } else {
    list.forEach((participant, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cellCenterX = startX + col * (cellW + gap) + cellW / 2;
      const tileX = cellCenterX - tileSize / 2;
      const tileY = startY + row * (tileSize + labelSpace + gap);
      const radius = Math.min(28, tileSize * 0.16);

      const guessColor =
        participant.prediction === "boy" ? "#38bdf8" : "#f472b6";
      const guessSoft =
        participant.prediction === "boy" ? "#0c4a6e" : "#831843";
      const guessedRight = participant.prediction === options.revealedGender;

      // Tile image or initial avatar
      ctx.save();
      drawRoundedRect(ctx, tileX, tileY, tileSize, tileSize, radius);
      ctx.clip();

      const img = loadedImages[idx];
      if (img) {
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(
          img,
          sx,
          sy,
          minSide,
          minSide,
          tileX,
          tileY,
          tileSize,
          tileSize
        );
      } else {
        ctx.fillStyle = guessSoft;
        ctx.fillRect(tileX, tileY, tileSize, tileSize);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `900 ${Math.round(tileSize * 0.34)}px 'Archivo Black', sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(
          getInitials(participant.name),
          tileX + tileSize / 2,
          tileY + tileSize / 2
        );
        ctx.textBaseline = "alphabetic";
      }
      ctx.restore();

      // Color-coded prediction border
      drawRoundedRect(ctx, tileX, tileY, tileSize, tileSize, radius);
      ctx.lineWidth = Math.max(4, tileSize * 0.032);
      ctx.strokeStyle = guessColor;
      ctx.stroke();

      // Correct-guess gold star badge
      if (guessedRight) {
        const badgeR = Math.max(14, tileSize * 0.11);
        const bx = tileX + tileSize - badgeR * 0.55;
        const by = tileY + badgeR * 0.55;
        ctx.beginPath();
        ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
        ctx.fillStyle = "#facc15";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#081226";
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `900 ${Math.round(badgeR * 1.15)}px sans-serif`;
        ctx.fillStyle = "#081226";
        ctx.fillText("★", bx, by + 1);
        ctx.textBaseline = "alphabetic";
      }

      // Guest Name
      ctx.textAlign = "center";
      ctx.font = `700 ${count > 12 ? 20 : 24}px 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.fillStyle = "#e2e8f0";
      const trimmed =
        participant.name.length > 14
          ? `${participant.name.slice(0, 13)}…`
          : participant.name;
      ctx.fillText(trimmed, cellCenterX, tileY + tileSize + (count > 12 ? 24 : 30));
    });
  }

  // 7. Footer Watermark
  ctx.textAlign = "center";
  ctx.font = "700 22px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillStyle = accentSoft;
  const extraCount =
    options.participants.length > list.length
      ? `  •  +${options.participants.length - list.length}`
      : "";
  ctx.fillText(
    `${options.stats.total} ${options.locale === "tr" ? "Katılımcı" : "Guests"}${extraCount}  •  boyorgirl.party`,
    width / 2,
    height - 38
  );

  // Thin bottom accent strip
  ctx.fillStyle = accentPrimary;
  ctx.fillRect(0, height - 10, width, 10);

  return canvas.toDataURL("image/png");
}
