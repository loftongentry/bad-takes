import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { ArchivoBlack_400Regular } from "@expo-google-fonts/archivo-black";
import { Archivo_500Medium, Archivo_700Bold } from "@expo-google-fonts/archivo";
import { PermanentMarker_400Regular } from "@expo-google-fonts/permanent-marker";
import { TamaguiProvider, Theme } from "tamagui";
import config from "../tamagui.config";
import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "../src/graphql/client";
import { SOAPBOX } from "../src/ui/soapbox/tokens";

const Layout = () => {
  // The Soapbox fonts (see src/ui/soapbox/tokens.ts). If one fails to load, the app still
  // starts with the system font rather than hanging on a blank screen.
  const [fontsLoaded, fontError] = useFonts({
    ArchivoBlack_400Regular,
    Archivo_500Medium,
    Archivo_700Bold,
    PermanentMarker_400Regular,
  });
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ApolloProvider client={apolloClient}>
      <TamaguiProvider config={config}>
        <Theme name="light">
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: SOAPBOX.kraft },
            }}
          />
        </Theme>
      </TamaguiProvider>
    </ApolloProvider>
  );
};

export default Layout;
