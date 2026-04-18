import sharp from "sharp";

const W = 1408;
const H = 768;

const BG = "#0A0A0A";
const RED = "#FF1744";
const WHITE = "#FFFFFF";
const MUTED = "#9CA3AF";

const SHOT = "attached_assets/image_1776517811041.png";
const SHOT_W = 1240;
const SHOT_X = (W - SHOT_W) / 2;
const SHOT_Y = 320;

const shotMeta = await sharp(SHOT).metadata();
const SHOT_H = Math.round((SHOT_W / shotMeta.width) * shotMeta.height);

const shotBuf = await sharp(SHOT)
  .resize({ width: SHOT_W })
  .toBuffer();

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Brand -->
  <g transform="translate(70, 60)">
    <g transform="translate(0, 4) rotate(-25, 32, 32)">
      <rect x="0" y="20" width="64" height="28" rx="14" ry="14"
            fill="${WHITE}" stroke="${BG}" stroke-width="4"/>
      <rect x="0" y="20" width="32" height="28" rx="14" ry="14"
            fill="${RED}" stroke="${BG}" stroke-width="4"/>
      <line x1="32" y1="22" x2="32" y2="48" stroke="${BG}" stroke-width="4"/>
    </g>
    <text x="84" y="56" font-family="Impact, 'Arial Black', sans-serif"
          font-size="52" font-weight="900" letter-spacing="-2">
      <tspan fill="${RED}">DUM</tspan><tspan fill="${WHITE}">.FUN</tspan>
    </text>
  </g>

  <!-- Live badge top-right -->
  <g transform="translate(${W - 240}, 76)">
    <rect x="0" y="0" width="170" height="36" rx="18" ry="18"
          fill="none" stroke="${WHITE}" stroke-width="2"/>
    <circle cx="20" cy="18" r="5" fill="#10B981"/>
    <text x="36" y="24" font-family="'Helvetica Neue', Arial, sans-serif"
          font-size="15" font-weight="700" fill="${WHITE}" letter-spacing="2">
      LIVE • DEVNET
    </text>
  </g>

  <!-- Hero -->
  <text x="${W / 2}" y="220" font-family="Impact, 'Arial Black', sans-serif"
        font-size="96" font-weight="900" fill="${WHITE}" text-anchor="middle"
        letter-spacing="-3">
    WILL THE DEV <tspan fill="${RED}">RUG?</tspan>
  </text>

  <!-- Subtitle -->
  <text x="${W / 2}" y="270" font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="24" font-weight="500" fill="${MUTED}" text-anchor="middle">
    Launch tokens. Bet on whether they survive.
  </text>

  <!-- Screenshot frame -->
  <rect x="${SHOT_X - 6}" y="${SHOT_Y - 6}"
        width="${SHOT_W + 12}" height="${SHOT_H + 12}"
        rx="14" ry="14" fill="${WHITE}"/>
</svg>
`;

const base = await sharp(Buffer.from(svg)).png().toBuffer();

await sharp(base)
  .composite([{ input: shotBuf, top: SHOT_Y, left: Math.round(SHOT_X) }])
  .png({ quality: 100, compressionLevel: 9 })
  .toFile("attached_assets/generated_images/og_v7.png");

console.log("Wrote attached_assets/generated_images/og_v7.png");
