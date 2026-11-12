import { StyleSheet, Text } from "react-native";
import { Sign } from "./Sign";
import { FONTS, SOAPBOX } from "./tokens";

// Marker lettering shrinks a little as a take gets longer (takes are at most 140 characters)
export const takeFontSize = (text: string) => (text.length > 100 ? 21 : text.length > 50 ? 25 : 30);

export const takeTextStyle = {
  fontFamily: FONTS.marker,
  color: SOAPBOX.marker,
  textAlign: "center",
} as const;

// A bad take, hand-lettered on a cardboard sign
export const TakeSign = ({ text, tilt = -2 }: { text: string; tilt?: number }) => {
  const size = takeFontSize(text);
  return (
    <Sign tilt={tilt}>
      <Text style={[takeTextStyle, styles.text, { fontSize: size, lineHeight: size * 1.25 }]}>
        {text}
      </Text>
    </Sign>
  );
};

const styles = StyleSheet.create({
  text: { width: "100%", paddingVertical: 6 },
});
