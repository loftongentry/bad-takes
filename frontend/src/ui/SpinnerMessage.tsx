import type { ReactNode } from "react";
import { Spinner, Text, View } from "tamagui";
import { COLORS } from "./theme";

// Large spinner over a centered message, for "waiting on other players" states
export const SpinnerMessage = ({ children }: { children: ReactNode }) => {
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 40,
      }}
    >
      <Spinner
        size="large"
        color={COLORS.light}
        style={{
          marginBottom: 20,
        }}
      />
      <Text
        style={{
          color: COLORS.light,
          fontSize: 18,
          textAlign: "center",
          opacity: 0.8,
          lineHeight: 28,
        }}
      >
        {children}
      </Text>
    </View>
  );
};
