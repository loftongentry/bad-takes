import { Stack } from "expo-router";
import { TamaguiProvider, Theme } from "tamagui";
import config from "../tamagui.config";
import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "../src/graphql/client";

export default function Layout() {
  return (
    <ApolloProvider client={apolloClient}>
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
    </ApolloProvider>
  );
}
