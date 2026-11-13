import { useEffect, useRef, useState } from "react";
import { Stack, usePathname, type ErrorBoundaryProps } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { ArchivoBlack_400Regular } from "@expo-google-fonts/archivo-black";
import { Archivo_500Medium, Archivo_700Bold } from "@expo-google-fonts/archivo";
import { PermanentMarker_400Regular } from "@expo-google-fonts/permanent-marker";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "tamagui";
import config from "../tamagui.config";
import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "../src/graphql/client";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";
import { preloadSounds } from "../src/audio/sfx";
import { useSessionHydrated } from "../src/state/gameSessionStore";
import { checkForGameToResume } from "../src/session/resume";
import { NoticeHost } from "../src/ui/NoticeHost";
import { KraftBackground } from "../src/ui/soapbox/KraftBackground";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";

// Keep the launch screen up until the fonts are in and any saved game has been checked, so the
// first thing players see after it is the finished Home screen or their game (not a blank frame,
// then text changing font). Fades out on phones.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: true, duration: 300 });

const Layout = () => {
  // The Soapbox fonts (see src/ui/soapbox/tokens.ts). If one fails to load, the app still
  // starts with the system font rather than hanging on a blank screen.
  const [fontsLoaded, fontError] = useFonts({
    ArchivoBlack_400Regular,
    Archivo_500Medium,
    Archivo_700Bold,
    PermanentMarker_400Regular,
  });
  // Load the sound effects up front so the first one plays on time
  useEffect(() => {
    preloadSounds();
  }, []);

  // A game saved on this device (the app was closed or the page refreshed mid-game). Only checked
  // when the app opens on Home: a web page refreshed on a game screen just carries on there.
  const sessionHydrated = useSessionHydrated();
  const pathname = usePathname();
  const startedOnHome = useRef(pathname === "/");
  const [resumeChecked, setResumeChecked] = useState(false);
  useEffect(() => {
    if (!sessionHydrated) {
      return;
    }
    if (!startedOnHome.current) {
      setResumeChecked(true);
      return;
    }
    checkForGameToResume().finally(() => setResumeChecked(true));
  }, [sessionHydrated]);

  const ready = (fontsLoaded || !!fontError) && resumeChecked;
  useEffect(() => {
    if (ready) {
      SplashScreen.hide();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  // SafeAreaProvider is ours to supply: Expo Router stopped providing it on the web in SDK 58,
  // and SoapboxPage reads the insets to keep content clear of the notch and home bar
  return (
    <SafeAreaProvider>
      <ApolloProvider client={apolloClient}>
        <TamaguiProvider config={config}>
          <Theme name="light">
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: SOAPBOX.kraft },
              }}
            />
            <NoticeHost />
          </Theme>
        </TamaguiProvider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
};

// Shown instead of the app if a screen crashes. Kept to plain components, since the providers
// above may be what failed. The saved session survives, so reopening the app goes back into
// the game.
export const ErrorBoundary = ({ retry }: ErrorBoundaryProps) => (
  <View style={styles.crash}>
    <KraftBackground />
    <Text style={styles.crashTitle} accessibilityRole="header">
      Well, That Broke
    </Text>
    <Text style={styles.crashText}>
      Something went wrong on this screen. Try again, or close and reopen the app: you&apos;ll go
      straight back into your game.
    </Text>
    <SoapboxButton onPress={retry}>Try Again</SoapboxButton>
  </View>
);

const styles = StyleSheet.create({
  crash: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    gap: 18,
    backgroundColor: SOAPBOX.kraft,
  },
  crashTitle: {
    fontFamily: FONTS.heading,
    fontSize: 34,
    textTransform: "uppercase",
    color: SOAPBOX.marker,
  },
  crashText: { fontFamily: FONTS.body, fontSize: 17, lineHeight: 24, color: SOAPBOX.marker },
});

export default Layout;
