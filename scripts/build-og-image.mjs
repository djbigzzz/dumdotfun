import sharp from "sharp";

const W = 1408;
const H = 768;

const BG = "#0A0A0A";
const RED = "#FF1744";
const WHITE = "#FFFFFF";
const MUTED = "#9CA3AF";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Top-left: brand wordmark with pill -->
  <g transform="translate(70, 64)">
    <g transform="translate(0, 4) rotate(-25, 32, 32)">
      <rect x="0" y="20" width="64" height="28" rx="14" ry="14"
            fill="${WHITE}" stroke="${BG}" stroke-width="4"/>
      <rect x="0" y="20" width="32" height="28" rx="14" ry="14"
            fill="${RED}" stroke="${BG}" stroke-width="4"/>
      <line x1="32" y1="22" x2="32" y2="48" stroke="${BG}" stroke-width="4"/>
    </g>
    <text x="84" y="58" font-family="Impact, 'Arial Black', sans-serif"
          font-size="56" font-weight="900" letter-spacing="-2">
      <tspan fill="${RED}">DUM</tspan><tspan fill="${WHITE}">.FUN</tspan>
    </text>
  </g>

  <!-- Hero question, centered -->
  <text x="${W / 2}" y="370" font-family="Impact, 'Arial Black', sans-serif"
        font-size="116" font-weight="900" fill="${WHITE}" text-anchor="middle"
        letter-spacing="-3">
    WILL THE DEV <tspan fill="${RED}">RUG?</tspan>
  </text>

  <!-- Subtitle -->
  <text x="${W / 2}" y="440" font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="28" font-weight="500" fill="${MUTED}" text-anchor="middle">
    Launch tokens. Bet on whether they survive.
  </text>

  <!-- Bottom URL -->
  <text x="${W / 2}" y="${H - 70}" font-family="'Courier New', monospace"
        font-size="24" font-weight="700" fill="${WHITE}" text-anchor="middle"
        letter-spacing="6">
    DUM.FUN
  </text>
</svg>
`;

await sharp(Buffer.from(svg))
  .png({ quality: 100, compressionLevel: 9 })
  .toFile("attached_assets/generated_images/og_v6.png");

console.log("Wrote attached_assets/generated_images/og_v6.png");
