import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { FONTS, SOAPBOX } from "./tokens";

// A paper note with a spinner, for "waiting on other players" moments
export const WaitingNote = ({ children, detail }: { children: ReactNode; detail?: ReactNode }) => (
  <View style={styles.note}>
    <View style={styles.tape} />
    <ActivityIndicator size="large" color={SOAPBOX.marker} />
    <Text style={styles.message}>{children}</Text>
    {detail ? <Text style={styles.detail}>{detail}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  note: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    paddingVertical: 26,
    paddingHorizontal: 22,
    backgroundColor: SOAPBOX.paper,
    borderWidth: 2,
    borderColor: SOAPBOX.marker,
    borderRadius: 3,
    boxShadow: "5px 6px 0px rgba(31, 26, 23, 0.35)",
    transform: [{ rotate: "1deg" }],
  },
  tape: {
    position: "absolute",
    top: -12,
    width: 96,
    height: 24,
    backgroundColor: SOAPBOX.caution,
    opacity: 0.9,
    transform: [{ rotate: "-3deg" }],
  },
  message: {
    fontFamily: FONTS.bodyBold,
    fontSize: 19,
    lineHeight: 26,
    textAlign: "center",
    color: SOAPBOX.marker,
  },
  detail: {
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
});
