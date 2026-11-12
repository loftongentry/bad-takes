import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useSettingsStore } from "../state/settingsStore";
import tap from "../../assets/sounds/tap.wav";
import pop from "../../assets/sounds/pop.wav";
import tick from "../../assets/sounds/tick.wav";
import slam from "../../assets/sounds/slam.wav";
import stamp from "../../assets/sounds/stamp.wav";
import whoosh from "../../assets/sounds/whoosh.wav";
import punch from "../../assets/sounds/punch.wav";
import crate from "../../assets/sounds/crate.wav";
import fanfare from "../../assets/sounds/fanfare.wav";

// The game's sound effects (made by scripts/make-sounds.js; swap in a recording by replacing
// a file with one of the same name)
const SOURCES = { tap, pop, tick, slam, stamp, whoosh, punch, crate, fanfare } as const;
export type SoundName = keyof typeof SOURCES;
export const SOUND_NAMES = Object.keys(SOURCES) as SoundName[];

// How loud each one plays, so everyday clicks sit well under the big moments
const VOLUME: Record<SoundName, number> = {
  tap: 0.35,
  pop: 0.5,
  tick: 0.7,
  slam: 1,
  stamp: 0.9,
  whoosh: 0.6,
  punch: 0.75,
  crate: 0.7,
  fanfare: 0.7,
};

const players: Partial<Record<SoundName, AudioPlayer>> = {};

const playerFor = (name: SoundName) => {
  let player = players[name];
  if (!player) {
    player = createAudioPlayer(SOURCES[name]);
    player.volume = VOLUME[name];
    players[name] = player;
  }
  return player;
};

// Loads every sound up front so the first play isn't late. Sounds follow the iPhone's silent
// switch and play over any music already going rather than stopping it.
export function preloadSounds() {
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(
    () => {},
  );
  SOUND_NAMES.forEach(playerFor);
}

// Plays a sound from the start, unless the player has muted the game. Never throws: a sound
// that can't play (e.g. a browser blocking audio before the first tap) is just skipped.
export function play(name: SoundName) {
  if (useSettingsStore.getState().muted) {
    return;
  }
  try {
    const player = playerFor(name);
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Sound is a nice-to-have; never let it break the game
  }
}
