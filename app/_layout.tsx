import { Stack } from "expo-router";
import { TamaguiProvider, Theme } from "tamagui";
import config from "../tamagui.config";

export default function Layout() {
  return (
    <TamaguiProvider config={config}>
      <Theme name="dark">
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#131514' },
          }}
        />
      </Theme>
    </TamaguiProvider>
  );
}
