import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Dialog, ScrollView } from "tamagui";
import { Info } from "@tamagui/lucide-icons";
import { SoapboxButton } from "./soapbox/SoapboxButton";
import { FONTS, SOAPBOX } from "./soapbox/tokens";
import { useRules } from "../hooks/useRules";

// "45 seconds", "90 seconds", "5 minutes"
const describeSeconds = (seconds: number) =>
  seconds >= 120 && seconds % 60 === 0 ? `${seconds / 60} minutes` : `${seconds} seconds`;

const Rule = ({ n, title, children }: { n: number; title: string; children: ReactNode }) => (
  <View style={styles.rule}>
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{n}</Text>
    </View>
    <View style={styles.ruleBody}>
      <Text style={styles.ruleTitle}>{title}</Text>
      <Text style={styles.ruleText}>{children}</Text>
    </View>
  </View>
);

// The rules, as a paper notice taped over the Home screen
export const HowToPlay = () => {
  // The numbers come from the server; until they load, the rules are described without them
  const rules = useRules();
  const defenseRange = rules
    ? `the host sets it, from ${describeSeconds(rules.timeLimit.min)} to ${describeSeconds(rules.timeLimit.max)}`
    : "the host sets how long";
  const voteTime = rules ? `${describeSeconds(rules.voteSeconds)}` : "a short time";

  return (
    <Dialog modal>
      <Dialog.Trigger asChild>
        <SoapboxButton variant="outline" icon={<Info color={SOAPBOX.marker} size={22} />}>
          How to Play
        </SoapboxButton>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay key="overlay" style={{ backgroundColor: "rgba(31, 26, 23, 0.6)" }} />

        <Dialog.Content key="content" style={styles.notice}>
          <View style={styles.noticeTape} />
          <Dialog.Title unstyled style={styles.heading}>
            How to Play
          </Dialog.Title>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            <Rule n={1} title="Create or join a room">
              The host creates a game. Everyone else joins using the room code
            </Rule>

            <Rule n={2} title="Write a prompt">
              When the round starts, each player writes a controversial “bad take” before the
              writing timer runs out. If someone doesn’t finish in time, the game plays on with the
              takes that came in
            </Rule>

            <Rule n={3} title="Random assignment">
              After all prompts are submitted, players take turns in a random order, each defending
              a randomly selected prompt (never their own)
            </Rule>

            <Rule n={4} title="Defend it against the clock">
              The defender argues in favor of the prompt, even if they disagree with it, until the
              timer runs out ({defenseRange})
            </Rule>

            <Rule n={5} title="Vote">
              When time’s up, everyone else votes thumbs up or down on how well the player defended
              the prompt, with {voteTime} to decide
            </Rule>

            <Rule n={6} title="No repeats in a round">
              After a player defends once, they can’t be selected again until the next round (with
              new prompts)
            </Rule>

            <Rule n={7} title="Results">
              Points are totaled and the top players are shown at the end.
            </Rule>
          </ScrollView>

          <View style={{ marginTop: 16 }}>
            <Dialog.Close asChild>
              <SoapboxButton>Got it</SoapboxButton>
            </Dialog.Close>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};

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
  noticeTape: {
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
  rule: { flexDirection: "row", gap: 12, marginBottom: 14 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SOAPBOX.marker,
  },
  badgeText: { fontFamily: FONTS.heading, fontSize: 14, color: SOAPBOX.paper },
  ruleBody: { flex: 1 },
  ruleTitle: { fontFamily: FONTS.bodyBold, fontSize: 16, color: SOAPBOX.marker },
  ruleText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
    color: SOAPBOX.markerSoft,
  },
});
