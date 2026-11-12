import { useId } from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, Pattern, RadialGradient, Rect, Stop } from "react-native-svg";
import { SOAPBOX } from "./tokens";

// Full-screen cardboard: kraft brown with faint fibers and slightly darker edges.
// Place it first inside a screen's root view; it sits behind everything and ignores touches.
export const KraftBackground = () => {
  // Each copy needs its own ids: on the web, earlier screens stay in the page (hidden), and a
  // shared id would point at a hidden screen's pattern, which doesn't draw
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fibers = `kraft-fibers-${id}`;
  const edges = `kraft-edges-${id}`;

  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id={fibers} width={7} height={4} patternUnits="userSpaceOnUse">
          <Rect width={2} height={4} fill="#000" fillOpacity={0.035} />
          <Rect width={7} height={1} fill="#fff" fillOpacity={0.05} />
        </Pattern>
        <RadialGradient id={edges} cx="50%" cy="45%" r="75%">
          <Stop offset="0.55" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#3B2A1A" stopOpacity={0.22} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={SOAPBOX.kraft} />
      <Rect width="100%" height="100%" fill={`url(#${fibers})`} />
      <Rect width="100%" height="100%" fill={`url(#${edges})`} />
    </Svg>
  );
};
