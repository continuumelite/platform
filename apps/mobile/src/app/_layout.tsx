import {
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  useFonts,
} from '@expo-google-fonts/jost';
import { Spectral_400Regular_Italic, Spectral_600SemiBold } from '@expo-google-fonts/spectral';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

// Navigation chrome in brand colors.
const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    primary: Colors.light.accent,
    border: Colors.light.backgroundSelected,
  },
};
const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    primary: Colors.dark.accent,
    border: Colors.dark.backgroundSelected,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    Spectral_600SemiBold,
    Spectral_400Regular_Italic,
  });
  // If fonts fail to load, carry on with system fonts rather than staying on the splash screen.
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? darkTheme : lightTheme}>
      <SessionProvider>
        <SplashScreenController fontsReady={fontsReady} />
        {fontsReady && <RootNavigator />}
      </SessionProvider>
    </ThemeProvider>
  );
}

/** Keeps the splash screen up until fonts are loaded and we know whether someone is signed in. */
function SplashScreenController({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && fontsReady) SplashScreen.hide();
  }, [isLoading, fontsReady]);

  return null;
}

function RootNavigator() {
  const { session, isLoading } = useSession();
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
