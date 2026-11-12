// The Soapbox look: a street protest made of cardboard, marker, caution tape and rubber stamps.
// Screens move onto these one at a time; the old dark theme lives in ../theme.ts until then.

export const SOAPBOX = {
  kraft: "#C9A47E", // background cardboard
  kraftLight: "#D9B993", // signs and cards cut from lighter board
  kraftDark: "#A8845F", // cardboard edges and the shadow under signs
  paper: "#F3E7D6", // notices taped up, and text on marker-black buttons
  marker: "#1F1A17", // text, outlines, primary buttons
  markerSoft: "#4A3F36", // secondary text
  caution: "#F5C518", // caution tape, the timer
  boo: "#D7263D", // down vote
  cheer: "#2E8B57", // up vote
  wood: "#8B6A47", // crates on the results podium
  woodDark: "#6B4F33",
  tape: "rgba(243, 231, 214, 0.78)", // masking tape holding signs up
} as const;

// Font family names, as registered by useFonts in app/_layout.tsx. Custom fonts carry their own
// weight, so don't combine these with fontWeight (Android picks the wrong face if you do).
export const FONTS = {
  heading: "ArchivoBlack_400Regular",
  body: "Archivo_500Medium",
  bodyBold: "Archivo_700Bold",
  marker: "PermanentMarker_400Regular", // only for the takes themselves, so it stays special
} as const;
