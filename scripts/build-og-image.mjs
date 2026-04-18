import sharp from "sharp";
import { writeFileSync } from "fs";

const W = 1408;
const H = 768;

// Neo-brutalist palette pulled from the live app
const BG = "#0A0A0A";
const RED = "#EF4444";
const GREEN = "#22C55E";
const YELLOW = "#FACC15";
const WHITE = "#FFFFFF";
const CARD_BG = "#171717";
const STROKE = "#FFFFFF";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="brutalShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feOffset dx="8" dy="8"/>
      <feFlood flood-color="${YELLOW}"/>
      <feComposite in2="SourceAlpha" operator="in"/>
    </filter>
    <filter id="brutalShadowRed" x="-10%" y="-10%" width="120%" height="120%">
      <feOffset dx="8" dy="8"/>
      <feFlood flood-color="${RED}"/>
      <feComposite in2="SourceAlpha" operator="in"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Subtle dotted grid -->
  ${Array.from({ length: 40 }, (_, i) =>
    Array.from({ length: 22 }, (_, j) =>
      `<circle cx="${i * 36 + 18}" cy="${j * 36 + 18}" r="1" fill="#222"/>`
    ).join("")
  ).join("")}

  <!-- ===== TOP BAR: brand wordmark ===== -->
  <g transform="translate(60, 50)">
    <!-- Pill icon: red+white tilted capsule (matches favicon) -->
    <g transform="translate(0, 6) rotate(-25, 36, 36)">
      <rect x="0" y="20" width="72" height="32" rx="16" ry="16"
            fill="${WHITE}" stroke="${BG}" stroke-width="4"/>
      <rect x="0" y="20" width="36" height="32" rx="16" ry="16"
            fill="${RED}" stroke="${BG}" stroke-width="4"/>
      <line x1="36" y1="22" x2="36" y2="50" stroke="${BG}" stroke-width="4"/>
    </g>
    <!-- Wordmark -->
    <text x="100" y="68" font-family="Impact, 'Arial Black', sans-serif"
          font-size="72" font-weight="900" fill="${WHITE}"
          letter-spacing="-2">
      <tspan fill="${RED}">DUM</tspan><tspan fill="${WHITE}">.FUN</tspan>
    </text>
  </g>

  <!-- Top-right: tiny URL chip -->
  <g transform="translate(${W - 240}, 60)">
    <rect x="0" y="0" width="180" height="48" rx="6" ry="6"
          fill="${BG}" stroke="${WHITE}" stroke-width="3"/>
    <text x="90" y="32" font-family="'Courier New', monospace"
          font-size="22" font-weight="700" fill="${WHITE}" text-anchor="middle">
      dum.fun
    </text>
  </g>

  <!-- ===== LEFT CARD: TOKEN LAUNCHPAD ===== -->
  <g transform="translate(70, 200)">
    <!-- shadow -->
    <rect x="10" y="10" width="600" height="440" fill="${YELLOW}"/>
    <!-- card -->
    <rect x="0" y="0" width="600" height="440" fill="${CARD_BG}"
          stroke="${WHITE}" stroke-width="5"/>

    <!-- Section label -->
    <rect x="0" y="0" width="160" height="36" fill="${YELLOW}"/>
    <text x="80" y="26" font-family="Impact, 'Arial Black', sans-serif"
          font-size="20" font-weight="900" fill="${BG}" text-anchor="middle"
          letter-spacing="1">
      LAUNCH
    </text>

    <!-- Token avatar circle -->
    <circle cx="80" cy="110" r="42" fill="${YELLOW}" stroke="${WHITE}" stroke-width="4"/>
    <text x="80" y="124" font-family="Impact, 'Arial Black', sans-serif"
          font-size="46" font-weight="900" fill="${BG}" text-anchor="middle">$</text>

    <!-- Token info -->
    <text x="148" y="98" font-family="Impact, 'Arial Black', sans-serif"
          font-size="40" font-weight="900" fill="${WHITE}">
      $DEGEN
    </text>
    <text x="148" y="130" font-family="'Courier New', monospace"
          font-size="22" fill="#9CA3AF">
      0.0042 SOL  •  +147%
    </text>

    <!-- Sparkline (going up) -->
    <polyline points="40,260 110,250 170,235 230,220 290,180 350,200 410,160 470,140 530,90 560,70"
              fill="none" stroke="${GREEN}" stroke-width="6"
              stroke-linejoin="round" stroke-linecap="round"/>
    <!-- baseline -->
    <line x1="40" y1="280" x2="560" y2="280" stroke="#333" stroke-width="2" stroke-dasharray="4 6"/>

    <!-- BUY button -->
    <rect x="40" y="320" width="240" height="80" fill="${GREEN}"
          stroke="${WHITE}" stroke-width="4"/>
    <text x="160" y="372" font-family="Impact, 'Arial Black', sans-serif"
          font-size="38" font-weight="900" fill="${BG}" text-anchor="middle"
          letter-spacing="1">
      BUY
    </text>

    <!-- amount -->
    <rect x="300" y="320" width="260" height="80" fill="${BG}"
          stroke="${WHITE}" stroke-width="4"/>
    <text x="430" y="372" font-family="'Courier New', monospace"
          font-size="32" font-weight="700" fill="${WHITE}" text-anchor="middle">
      0.5 SOL
    </text>
  </g>

  <!-- ===== MIDDLE: PLUS SIGN connector ===== -->
  <g transform="translate(680, 380)">
    <circle cx="36" cy="36" r="36" fill="${YELLOW}" stroke="${WHITE}" stroke-width="5"/>
    <text x="36" y="56" font-family="Impact, 'Arial Black', sans-serif"
          font-size="60" font-weight="900" fill="${BG}" text-anchor="middle">
      +
    </text>
  </g>

  <!-- ===== RIGHT CARD: PREDICTION MARKET ===== -->
  <g transform="translate(770, 200)">
    <!-- shadow -->
    <rect x="10" y="10" width="600" height="440" fill="${RED}"/>
    <!-- card -->
    <rect x="0" y="0" width="600" height="440" fill="${CARD_BG}"
          stroke="${WHITE}" stroke-width="5"/>

    <!-- Section label -->
    <rect x="0" y="0" width="160" height="36" fill="${RED}"/>
    <text x="80" y="26" font-family="Impact, 'Arial Black', sans-serif"
          font-size="20" font-weight="900" fill="${WHITE}" text-anchor="middle"
          letter-spacing="1">
      BET
    </text>

    <!-- Question -->
    <text x="40" y="100" font-family="Impact, 'Arial Black', sans-serif"
          font-size="36" font-weight="900" fill="${WHITE}">
      Will $DEGEN survive?
    </text>
    <text x="40" y="132" font-family="'Courier New', monospace"
          font-size="20" fill="#9CA3AF">
      2.4 SOL pool  •  18 bets  •  3d 14h
    </text>

    <!-- YES bar -->
    <g transform="translate(40, 170)">
      <rect x="0" y="0" width="520" height="50" fill="#1F1F1F" stroke="${WHITE}" stroke-width="3"/>
      <rect x="0" y="0" width="350" height="50" fill="${GREEN}"/>
      <text x="20" y="34" font-family="Impact, 'Arial Black', sans-serif"
            font-size="26" font-weight="900" fill="${BG}">
        YES
      </text>
      <text x="500" y="34" font-family="Impact, 'Arial Black', sans-serif"
            font-size="26" font-weight="900" fill="${WHITE}" text-anchor="end">
        67%
      </text>
    </g>

    <!-- NO bar -->
    <g transform="translate(40, 240)">
      <rect x="0" y="0" width="520" height="50" fill="#1F1F1F" stroke="${WHITE}" stroke-width="3"/>
      <rect x="0" y="0" width="172" height="50" fill="${RED}"/>
      <text x="20" y="34" font-family="Impact, 'Arial Black', sans-serif"
            font-size="26" font-weight="900" fill="${WHITE}">
        NO
      </text>
      <text x="500" y="34" font-family="Impact, 'Arial Black', sans-serif"
            font-size="26" font-weight="900" fill="${WHITE}" text-anchor="end">
        33%
      </text>
    </g>

    <!-- BET buttons -->
    <rect x="40" y="320" width="252" height="80" fill="${GREEN}"
          stroke="${WHITE}" stroke-width="4"/>
    <text x="166" y="372" font-family="Impact, 'Arial Black', sans-serif"
          font-size="32" font-weight="900" fill="${BG}" text-anchor="middle"
          letter-spacing="1">
      BET YES
    </text>
    <rect x="308" y="320" width="252" height="80" fill="${RED}"
          stroke="${WHITE}" stroke-width="4"/>
    <text x="434" y="372" font-family="Impact, 'Arial Black', sans-serif"
          font-size="32" font-weight="900" fill="${WHITE}" text-anchor="middle"
          letter-spacing="1">
      BET NO
    </text>
  </g>

  <!-- ===== BOTTOM TAGLINE ===== -->
  <text x="${W / 2}" y="710" font-family="Impact, 'Arial Black', sans-serif"
        font-size="38" font-weight="900" fill="${WHITE}" text-anchor="middle"
        letter-spacing="1">
    LAUNCH A TOKEN. <tspan fill="${YELLOW}">BET ON WHETHER IT SURVIVES.</tspan>
  </text>

  <!-- thin top + bottom border accents -->
  <rect x="0" y="0" width="${W}" height="6" fill="${RED}"/>
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="${GREEN}"/>
</svg>
`;

await sharp(Buffer.from(svg))
  .png({ quality: 100, compressionLevel: 9 })
  .toFile("attached_assets/generated_images/og_v3.png");

console.log("Wrote attached_assets/generated_images/og_v3.png");
