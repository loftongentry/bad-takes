// Renders the app icon, Android adaptive icon, splash image and web favicon from the SVG artwork
// below, in the Soapbox look: BAD TAKES in big marker capitals on kraft, over caution tape.
//
// Needs a Chromium-based browser and puppeteer-core, which aren't project dependencies:
//   npm install --no-save puppeteer-core
//   BROWSER="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" node scripts/make-brand.mjs
// (PUPPETEER_DIR can point at another folder that has puppeteer-core installed.)
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const requireFrom = createRequire(path.join(process.env.PUPPETEER_DIR || root, "package.json"));
const puppeteer = requireFrom("puppeteer-core");
// Embedded in the page as a data URL (a page made with setContent can't load fonts from disk)
const font = `data:font/ttf;base64,${fs
  .readFileSync(
    path.join(
      root,
      "node_modules/@expo-google-fonts/archivo-black/400Regular/ArchivoBlack_400Regular.ttf",
    ),
  )
  .toString("base64")}`;

const C = {
  kraft: "#C9A47E",
  kraftLight: "#D9B993",
  kraftDark: "#A8845F",
  marker: "#1F1A17",
  caution: "#F5C518",
};

const defs = `
  <defs>
    <pattern id="fibers" width="9" height="5" patternUnits="userSpaceOnUse">
      <rect width="2.5" height="5" fill="#000" fill-opacity="0.04"/>
      <rect width="9" height="1.2" fill="#fff" fill-opacity="0.05"/>
    </pattern>
    <radialGradient id="edges" cx="50%" cy="45%" r="75%">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#3B2A1A" stop-opacity="0.28"/>
    </radialGradient>
    <pattern id="stripes" width="72" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <rect width="36" height="72" fill="${C.caution}"/>
      <rect x="36" width="36" height="72" fill="${C.marker}"/>
    </pattern>
  </defs>`;

const background = `
  <rect width="1024" height="1024" fill="${C.kraft}"/>
  <rect width="1024" height="1024" fill="url(#fibers)"/>
  <rect width="1024" height="1024" fill="url(#edges)"/>`;

// Caution tape stretched diagonally across the bottom, below the words
const tape = `
  <g transform="rotate(-10 512 512)">
    <rect x="-300" y="776" width="1624" height="118" fill="url(#stripes)"/>
    <rect x="-300" y="776" width="1624" height="118" fill="none" stroke="${C.marker}" stroke-opacity="0.35" stroke-width="8"/>
  </g>`;

// BAD TAKES in big marker-black capitals, tilted a little, with a hard cardboard-coloured shadow
const words = `
  <g transform="rotate(-6 512 440)">
    <g fill="${C.kraftDark}" transform="translate(16 18)">
      <text x="512" y="440" text-anchor="middle" font-family="SignFont" font-size="300">BAD</text>
      <text x="512" y="676" text-anchor="middle" font-family="SignFont" font-size="236">TAKES</text>
    </g>
    <g fill="${C.marker}">
      <text x="512" y="440" text-anchor="middle" font-family="SignFont" font-size="300">BAD</text>
      <text x="512" y="676" text-anchor="middle" font-family="SignFont" font-size="236">TAKES</text>
    </g>
  </g>`;

// Each output: canvas size, the SVG content (in a 1024 box unless viewBox says otherwise), and
// whether the background is transparent
const outputs = [
  // iOS and the default icon: the full scene (iOS rounds the corners itself)
  { file: "icon.png", size: [1024, 1024], svg: `${background}${tape}${words}` },
  // Android adaptive icon foreground: transparent, scaled into the centre safe zone (the
  // launcher masks it to a circle or squircle over the kraft background colour in app.json)
  {
    file: "adaptive-icon.png",
    size: [1024, 1024],
    transparent: true,
    svg: `<g transform="translate(512 512) scale(0.66) translate(-512 -512)">${tape}${words}</g>`,
  },
  // Splash: just the words, cropped close, shown centred on kraft
  {
    file: "splash-icon.png",
    size: [1024, 720],
    transparent: true,
    viewBox: "40 120 944 664",
    svg: words,
  },
  { file: "favicon.png", size: [48, 48], svg: `${background}${tape}${words}` },
];

const browser = await puppeteer.launch({ executablePath: process.env.BROWSER, headless: true });
try {
  const page = await browser.newPage();
  for (const { file, size, svg, transparent = false, viewBox = "0 0 1024 1024" } of outputs) {
    const [w, h] = size;
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><head><style>
      @font-face { font-family: SignFont; src: url("${font}"); }
      html, body { margin: 0; background: transparent; }
      svg { display: block; }
    </style></head><body>
      <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${defs}${svg}</svg>
    </body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(root, "assets", file),
      omitBackground: transparent,
      clip: { x: 0, y: 0, width: w, height: h },
    });
    console.log(`assets/${file}  ${w}x${h}${transparent ? " (transparent)" : ""}`);
  }
} finally {
  await browser.close();
}
