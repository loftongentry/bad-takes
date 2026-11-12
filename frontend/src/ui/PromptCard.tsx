import type { ReactNode } from "react";
import { Card, Text } from "tamagui";
import { COLORS } from "./theme";

// Shared by the read-only prompt text and the prompt-entry TextArea
export const promptTextStyle = {
  flex: 1,
  color: COLORS.dark,
  fontSize: 18,
  fontWeight: "600",
  minHeight: 200,
  textAlignVertical: "top",
  height: "100%",
  width: "100%",
} as const;

// The light "index card" a bad take is shown on
export const PromptCard = ({ children }: { children: ReactNode }) => {
  return (
    <Card
      style={{
        width: "100%",
        maxWidth: 320,
        minHeight: 340,
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderRadius: 18,
        backgroundColor: COLORS.light,
      }}
      bordered
    >
      {children}
    </Card>
  );
};

export const PromptText = ({ children }: { children: ReactNode }) => {
  return (
    <Text unstyled style={promptTextStyle}>
      {children}
    </Text>
  );
};
