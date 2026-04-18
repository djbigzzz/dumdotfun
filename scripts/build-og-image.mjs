import sharp from "sharp";

const W = 1408;
const H = 768;

const BG = "#000000";
const RED = "#FF1744";
const GREEN = "#00E676";
const YELLOW = "#FFEA00";
const WHITE = "#FFFFFF";
const CARD_BG = "#0F0F0F";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${RED}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${RED}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="greenGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${GREEN}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${GREEN}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="yellowGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${YELLOW}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${YELLOW}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- Background drama glows -->
  <ellipse cx="280" cy="500" rx="450" ry="320" fill="url(#greenGlow)"/>
  <ellipse cx="1100" cy="500" rx="450" ry="320" fill="url(#redGlow)"/>
  <ellipse cx="704" cy="280" rx="600" ry="160" fill="url(#yellowGlow)"/>

  <!-- Subtle dotted grid -->
  ${Array.from({ length: 40 }, (_, i) =>
    Array.from({ length: 22 }, (_, j) =>
      `<circle cx="${i * 36 + 18}" cy="${j * 36 + 18}" r="1" fill="#1a1a1a"/>`
    ).join("")
  ).join("")}

  <!-- ===== TOP BAR ===== -->
  <g transform="translate(60, 38)">
    <!-- Pill icon -->
    <g transform="translate(0, 6) rotate(-25, 36, 36)">
      <rect x="2" y="22" width="72" height="32" rx="16" ry="16"
            fill="${WHITE}" stroke="${BG}" stroke-width="5"/>
      <rect x="2" y="22" width="36" height="32" rx="16" ry="16"
            fill="${RED}" stroke="${BG}" stroke-width="5"/>
      <line x1="38" y1="24" x2="38" y2="52" stroke="${BG}" stroke-width="5"/>
    </g>
    <!-- Wordmark -->
    <text x="100" y="62" font-family="Impact, 'Arial Black', sans-serif"
          font-size="62" font-weight="900" letter-spacing="-2">
      <tspan fill="${RED}">DUM</tspan><tspan fill="${WHITE}">.FUN</tspan>
    </text>
  </g>

  <!-- Top-right: live devnet badge -->
  <g transform="translate(${W - 280}, 50)">
    <rect x="0" y="0" width="220" height="46" rx="4" ry="4"
          fill="${BG}" stroke="${GREEN}" stroke-width="3"/>
    <circle cx="22" cy="23" r="6" fill="${GREEN}"/>
    <text x="42" y="32" font-family="'Courier New', monospace"
          font-size="20" font-weight="700" fill="${WHITE}">
      LIVE • DEVNET
    </text>
  </g>

  <!-- ===== HERO QUESTION ===== -->
  <text x="${W / 2}" y="200" font-family="Impact, 'Arial Black', sans-serif"
        font-size="100" font-weight="900" fill="${WHITE}" text-anchor="middle"
        letter-spacing="-3">
    WILL THE DEV <tspan fill="${RED}">RUG?</tspan>
  </text>

  <!-- subtitle under hero -->
  <text x="${W / 2}" y="248" font-family="'Courier New', monospace"
        font-size="24" font-weight="700" fill="${YELLOW}" text-anchor="middle"
        letter-spacing="3">
    LAUNCH IT  •  BET ON IT  •  RUG OR MOON
  </text>

  <!-- ===== LEFT CARD: TOKEN ===== -->
  <g transform="translate(70, 310)">
    <!-- shadow -->
    <rect x="10" y="10" width="600" height="370" fill="${YELLOW}"/>
    <rect x="0" y="0" width="600" height="370" fill="${CARD_BG}"
          stroke="${WHITE}" stroke-width="5"/>

    <!-- Section label -->
    <rect x="0" y="0" width="200" height="42" fill="${YELLOW}"/>
    <text x="100" y="30" font-family="Impact, 'Arial Black', sans-serif"
          font-size="22" font-weight="900" fill="${BG}" text-anchor="middle"
          letter-spacing="3">
      LAUNCH
    </text>

    <!-- Token avatar -->
    <circle cx="80" cy="120" r="42" fill="${YELLOW}" stroke="${WHITE}" stroke-width="4"/>
    <text x="80" y="135" font-family="Impact, 'Arial Black', sans-serif"
          font-size="46" font-weight="900" fill="${BG}" text-anchor="middle">$</text>

    <!-- Token info -->
    <text x="148" y="108" font-family="Impact, 'Arial Black', sans-serif"
          font-size="44" font-weight="900" fill="${WHITE}">
      $DEGEN
    </text>
    <text x="148" y="142" font-family="'Courier New', monospace"
          font-size="22" fill="#9CA3AF">
      0.0042 SOL  <tspan fill="${GREEN}" font-weight="700">+147%</tspan>
    </text>

    <!-- Sparkline -->
    <polyline points="40,240 110,228 170,210 230,200 290,160 350,180 410,140 470,118 530,72 560,52"
              fill="none" stroke="${GREEN}" stroke-width="6"
              stroke-linejoin="round" stroke-linecap="round"/>
    <line x1="40" y1="260" x2="560" y2="260" stroke="#222" stroke-width="2" stroke-dasharray="4 6"/>

    <!-- BUY -->
    <rect x="40" y="285" width="240" height="64" fill="${GREEN}"
          stroke="${WHITE}" stroke-width="4"/>
    <text x="160" y="328" font-family="Impact, 'Arial Black', sans-serif"
          font-size="34" font-weight="900" fill="${BG}" text-anchor="middle"
          letter-spacing="3">
      APE IN
    </text>
    <rect x="300" y="285" width="260" height="64" fill="${BG}"
          stroke="${WHITE}" stroke-width="4"/>
    <text x="430" y="328" font-family="'Courier New', monospace"
          font-size="28" font-weight="700" fill="${WHITE}" text-anchor="middle">
      0.5 SOL
    </text>
  </g>

  <!-- ===== MIDDLE: VS connector ===== -->
  <g transform="translate(680, 470)">
    <circle cx="36" cy="36" r="46" fill="${BG}" stroke="${YELLOW}" stroke-width="5"/>
    <text x="36" y="54" font-family="Impact, 'Arial Black', sans-serif"
          font-size="44" font-weight="900" fill="${YELLOW}" text-anchor="middle"
          letter-spacing="-1">
      VS
    </text>
  </g>

  <!-- ===== RIGHT CARD: PREDICTION MARKET ===== -->
  <g transform="translate(770, 310)">
    <!-- shadow -->
    <rect x="10" y="10" width="600" height="370" fill="${RED}"/>
    <rect x="0" y="0" width="600" height="370" fill="${CARD_BG}"
          stroke="${WHITE}" stroke-width="5"/>

    <!-- Section label -->
    <rect x="0" y="0" width="200" height="42" fill="${RED}"/>
    <text x="100" y="30" font-family="Impact, 'Arial Black', sans-serif"
          font-size="22" font-weight="900" fill="${WHITE}" text-anchor="middle"
          letter-spacing="3">
      BET
    </text>

    <!-- Question -->
    <text x="40" y="108" font-family="Impact, 'Arial Black', sans-serif"
          font-size="38" font-weight="900" fill="${WHITE}">
      Will $DEGEN dev <tspan fill="${RED}">rug?</tspan>
    </text>
    <text x="40" y="138" font-family="'Courier New', monospace"
          font-size="20" fill="#9CA3AF">
      2.4 SOL pool  •  18 bets  •  3d 14h left
    </text>

    <!-- YES bar -->
    <g transform="translate(40, 168)">
      <rect x="0" y="0" width="520" height="46" fill="#1a1a1a" stroke="${WHITE}" stroke-width="3"/>
      <rect x="0" y="0" width="172" height="46" fill="${RED}"/>
      <text x="20" y="32" font-family="Impact, 'Arial Black', sans-serif"
            font-size="24" font-weight="900" fill="${WHITE}" letter-spacing="2">
        YES, RUGS
      </text>
      <text x="500" y="32" font-family="Impact, 'Arial Black', sans-serif"
            font-size="24" font-weight="900" fill="${WHITE}" text-anchor="end">
        33%
      </text>
    </g>

    <!-- NO bar -->
    <g transform="translate(40, 226)">
      <rect x="0" y="0" width="520" height="46" fill="#1a1a1a" stroke="${WHITE}" stroke-width="3"/>
      <rect x="0" y="0" width="350" height="46" fill="${GREEN}"/>
      <text x="20" y="32" font-family="Impact, 'Arial Black', sans-serif"
            font-size="24" font-weight="900" fill="${BG}" letter-spacing="2">
        NO, SURVIVES
      </text>
      <text x="500" y="32" font-family="Impact, 'Arial Black', sans-serif"
            font-size="24" font-weight="900" fill="${WHITE}" text-anchor="end">
        67%
      </text>
    </g>

    <!-- BET buttons -->
    <rect x="40" y="285" width="252" height="64" fill="${RED}"
          stroke="${WHITE}" stroke-width="4"/>
    <text x="166" y="328" font-family="Impact, 'Arial Black', sans-serif"
          font-size="30" font-weight="900" fill="${WHITE}" text-anchor="middle"
          letter-spacing="3">
      BET YES
    </text>
    <rect x="308" y="285" width="252" height="64" fill="${GREEN}"
          stroke="${WHITE}" stroke-width="4"/>
    <text x="434" y="328" font-family="Impact, 'Arial Black', sans-serif"
          font-size="30" font-weight="900" fill="${BG}" text-anchor="middle"
          letter-spacing="3">
      BET NO
    </text>
  </g>

  <!-- top + bottom border accents -->
  <rect x="0" y="0" width="${W}" height="6" fill="${RED}"/>
  <rect x="0" y="${H - 6}" width="${W}" height="6" fill="${GREEN}"/>

  <!-- bottom-right URL -->
  <text x="${W - 50}" y="${H - 28}" font-family="'Courier New', monospace"
        font-size="22" font-weight="700" fill="#666" text-anchor="end" letter-spacing="2">
    DUM.FUN
  </text>
</svg>
`;

await sharp(Buffer.from(svg))
  .png({ quality: 100, compressionLevel: 9 })
  .toFile("attached_assets/generated_images/og_v5.png");

console.log("Wrote attached_assets/generated_images/og_v5.png");
