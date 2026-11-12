// Synthesizes the game's sound effects into assets/sounds/*.wav, so there are no third-party
// sound files to license. Run `npm run make-sounds` after changing a recipe below; the output is
// deterministic (seeded noise), so unchanged recipes produce identical files. Any file can be
// replaced by a recorded sound with the same name.
const fs = require("fs");
const path = require("path");

const RATE = 22050;
const OUT = path.join(__dirname, "../assets/sounds");

// --- building blocks -------------------------------------------------------------------------

// Seeded white noise (mulberry32), so every run makes the same files
function makeNoise(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

// One-pole filters; `cutoff` may change per sample
function lowpass() {
  let y = 0;
  return (x, cutoff) => {
    y += (1 - Math.exp((-2 * Math.PI * cutoff) / RATE)) * (x - y);
    return y;
  };
}
function highpass() {
  const lp = lowpass();
  return (x, cutoff) => x - lp(x, cutoff);
}

// Exponential decay with time constant `tau` seconds, after a short linear attack
const env = (t, attack, tau) => (t < attack ? t / attack : Math.exp(-(t - attack) / tau));

// A sine whose frequency glides exponentially from f0 to f1 with time constant `tau`
function glide(f0, f1, tau) {
  let phase = 0;
  return (t) => {
    const f = f1 + (f0 - f1) * Math.exp(-t / tau);
    phase += (2 * Math.PI * f) / RATE;
    return Math.sin(phase);
  };
}

// Renders `seconds` of audio from `sample(t)`, scales it to `peak`, and fades the last 5 ms
function render(seconds, peak, sample) {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = sample(i / RATE);
  const max = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const fade = Math.round(0.005 * RATE);
  for (let i = 0; i < n; i++) {
    const tail = Math.min(1, (n - 1 - i) / fade);
    out[i] = (out[i] / max) * peak * tail;
  }
  return out;
}

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) =>
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2),
  );
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // bytes per second
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([header, data]));
}

// --- the sounds ------------------------------------------------------------------------------

const SOUNDS = {
  // Soft click for buttons
  tap: () => {
    const noise = makeNoise(1);
    const hp = highpass();
    const tone = glide(2400, 1800, 0.01);
    return render(
      0.05,
      0.3,
      (t) => hp(noise(), 2000) * env(t, 0.001, 0.006) + 0.5 * tone(t) * env(t, 0.001, 0.01),
    );
  },

  // Bubbly pop for letters landing on tiles and players joining
  pop: () => {
    const tone = glide(480, 1150, 0.03);
    return render(0.11, 0.45, (t) => tone(t) * env(t, 0.003, 0.03));
  },

  // Woodblock tick for the last seconds of a timer
  tick: () => {
    const a = glide(1300, 1250, 0.05);
    const b = glide(3200, 3100, 0.05);
    return render(
      0.08,
      0.55,
      (t) => a(t) * env(t, 0.001, 0.014) + 0.4 * b(t) * env(t, 0.001, 0.006),
    );
  },

  // A sign landing on cardboard: a deep thud with a papery slap and a little rumble
  slam: () => {
    const noise = makeNoise(2);
    const slap = lowpass();
    const rumble = lowpass();
    const body = glide(95, 42, 0.08);
    const overtone = glide(190, 90, 0.05);
    return render(0.6, 0.95, (t) => {
      const n = noise();
      return (
        body(t) * env(t, 0.002, 0.13) +
        0.35 * overtone(t) * env(t, 0.002, 0.05) +
        0.9 * slap(n, 1100) * env(t, 0.001, 0.035) +
        0.6 * rumble(n, 180) * env(t, 0.01, 0.16)
      );
    });
  },

  // A rubber stamp: a quick "ka" on contact, then a muffled thunk
  stamp: () => {
    const noise = makeNoise(3);
    const hp = highpass();
    const lp = lowpass();
    const thunk = glide(140, 70, 0.04);
    return render(0.32, 0.85, (t) => {
      const n = lp(hp(noise(), 700), 2600);
      return 1.3 * n * env(t, 0.0005, 0.016) + thunk(t) * env(t, 0.003, 0.06);
    });
  },

  // A sign tossed off the screen: breathy noise sweeping up in pitch
  whoosh: () => {
    const noise = makeNoise(4);
    const hp = highpass();
    const lp = lowpass();
    const len = 0.45;
    return render(len, 0.5, (t) => {
      const p = t / len;
      const center = 300 + 2700 * p * p;
      const shape =
        Math.sin(Math.PI * Math.min(1, p / 0.65) * 0.5) * (p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35);
      return lp(hp(noise(), center * 0.6), center * 1.6) * shape;
    });
  },

  // A title punching in: a short rising swish, then a hit
  punch: () => {
    const noise = makeNoise(5);
    const hp = highpass();
    const lp = lowpass();
    const hit = glide(170, 60, 0.05);
    const swish = 0.13;
    return render(0.36, 0.8, (t) => {
      const n = noise();
      if (t < swish) {
        const p = t / swish;
        return lp(hp(n, 500 + 2000 * p), 1500 + 3000 * p) * p * 0.8;
      }
      const u = t - swish;
      return hit(u) * env(u, 0.002, 0.07) + 0.5 * lp(n, 1400) * env(u, 0.001, 0.025);
    });
  },

  // A wooden crate knocking into place
  crate: () => {
    const noise = makeNoise(6);
    const lp = lowpass();
    const a = glide(205, 185, 0.05);
    const b = glide(450, 420, 0.04);
    const c = glide(780, 760, 0.03);
    return render(0.25, 0.7, (t) => {
      return (
        a(t) * env(t, 0.001, 0.07) +
        0.6 * b(t) * env(t, 0.001, 0.035) +
        0.3 * c(t) * env(t, 0.001, 0.015) +
        0.5 * lp(noise(), 2000) * env(t, 0.0005, 0.006)
      );
    });
  },

  // A short brassy fanfare for the winner: C, E, G, then a held high C
  fanfare: () => {
    const notes = [
      { f: 523.25, at: 0, tau: 0.12 },
      { f: 659.25, at: 0.11, tau: 0.12 },
      { f: 783.99, at: 0.22, tau: 0.12 },
      { f: 1046.5, at: 0.33, tau: 0.5 },
    ];
    const lp = lowpass();
    return render(1.2, 0.55, (t) => {
      let v = 0;
      for (const { f, at, tau } of notes) {
        if (t < at) continue;
        const u = t - at;
        const vibrato = tau > 0.3 ? 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * u) : 1;
        const w = 2 * Math.PI * f * vibrato * u;
        // A few harmonics of a sawtooth make it brassy
        const tone =
          Math.sin(w) + 0.5 * Math.sin(2 * w) + 0.33 * Math.sin(3 * w) + 0.2 * Math.sin(4 * w);
        v += tone * env(u, 0.012, tau);
      }
      return lp(v, 3500);
    });
  },
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(SOUNDS)) {
  const samples = make();
  writeWav(name, samples);
  console.log(`${name}.wav  ${(samples.length / RATE).toFixed(2)}s`);
}
