import { Slot } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReactQueryDevTools } from "@dev-plugins/react-query";
import { StatusBar, StyleSheet, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { TamaguiProvider } from "tamagui";
import tamaguiConfig from "../tamagui.config";
import { SplashView } from "@ksairi-org/react-native-splash-view";
import { useCustomFonts } from "@hooks";
import { LinguiClientProvider } from "@i18n";
import * as Sentry from "@sentry/react-native";
import { setupSentry } from "@sentry";
// Add your Rive splash animation to assets/splash.riv
import splash from "../assets/splash.riv";

// Optional: add Stripe — run /expo-rn-plugin:stripe for setup instructions
// import { StripeProvider } from "@stripe/stripe-react-native";
// const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

const shouldEnableSentry = !__DEV__;

setupSentry(shouldEnableSentry);

const SPLASH_FADE_OUT_DURATION_MS = 1000;

const styles = StyleSheet.create({
  gestureHandler: {
    flex: 1,
  },
});

const queryClient = new QueryClient();

queryClient.setDefaultOptions({
  queries: {
    retry: 1,
  },
});

const getSplashViewStyle = (isOSThemeDark: boolean) => ({
  backgroundColor: isOSThemeDark ? "#1a1a1a" : "#ffffff",
});

const ReactQueryDevToolsProvider = () => {
  useReactQueryDevTools(queryClient);
  return null;
};

const RootLayout = () => {
  const fontsLoaded = useCustomFonts();
  const colorScheme = useColorScheme();
  const isAppReady = fontsLoaded;
  const isOSThemeDark = colorScheme === "dark";

  if (!isAppReady) {
    return null;
  }

  return (
    <LinguiClientProvider>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevToolsProvider />
        <GestureHandlerRootView style={styles.gestureHandler}>
          <TamaguiProvider
            config={tamaguiConfig}
            defaultTheme={isOSThemeDark ? "dark" : "light"}
          >
            <BottomSheetModalProvider>
              <KeyboardProvider>
                <StatusBar barStyle={"default"} />
                <Slot />
              </KeyboardProvider>
            </BottomSheetModalProvider>
          </TamaguiProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
      <SplashView
        style={getSplashViewStyle(isOSThemeDark)}
        source={splash}
        fadeOutDuration={SPLASH_FADE_OUT_DURATION_MS}
        fadeOutDelay={2000}
      />
    </LinguiClientProvider>
  );
};

export default Sentry.wrap(RootLayout);
