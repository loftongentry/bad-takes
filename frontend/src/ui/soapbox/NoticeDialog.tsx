import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Dialog } from "tamagui";
import { FONTS, SOAPBOX } from "./tokens";

// The inside of a Tamagui Dialog, drawn as a paper notice taped over the cardboard.
// Use inside <Dialog> after the trigger: <NoticeDialog title="…">…</NoticeDialog>
export const NoticeDialog = ({ title, children }: { title: string; children: ReactNode }) => (
  <Dialog.Portal>
    <Dialog.Overlay key="overlay" style={{ backgroundColor: "rgba(31, 26, 23, 0.6)" }} />
    <Dialog.Content key="content" style={styles.notice}>
      <View style={styles.tape} />
      <Dialog.Title unstyled style={styles.heading}>
        {title}
      </Dialog.Title>
      {children}
    </Dialog.Content>
  </Dialog.Portal>
);

const styles = StyleSheet.create({
  notice: {
    width: "90%",
    maxWidth: 420,
    padding: 22,
    paddingTop: 26,
    backgroundColor: SOAPBOX.paper,
    borderWidth: 2,
    borderColor: SOAPBOX.marker,
    borderRadius: 3,
    boxShadow: "6px 7px 0px rgba(31, 26, 23, 0.4)",
    transform: [{ rotate: "-1deg" }],
  },
  tape: {
    position: "absolute",
    top: -13,
    alignSelf: "center",
    width: 120,
    height: 26,
    backgroundColor: SOAPBOX.caution,
    opacity: 0.9,
    transform: [{ rotate: "-3deg" }],
  },
  heading: {
    fontFamily: FONTS.heading,
    fontSize: 28,
    textTransform: "uppercase",
    color: SOAPBOX.marker,
    marginBottom: 14,
  },
});
