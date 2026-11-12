import { Stack } from "expo-router";
import { TamaguiProvider, Theme } from "tamagui";
import config from "../tamagui.config";
import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "../src/graphql/client";
import { COLORS } from "../src/ui/theme";

const Layout = () => {
  return (
    <ApolloProvider client={apolloClient}>
      <TamaguiProvider config={config}>
        <Theme name="dark">
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.background },
            }}
          />
        </Theme>
      </TamaguiProvider>
    </ApolloProvider>
  );
}

export default Layout