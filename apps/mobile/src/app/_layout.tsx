import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  DMSans_400Regular,
  DMSans_400Regular_Italic,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

// Navigation chrome in brand colors (the app is dark only).
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
  const [fontsLoaded, fontError] = useFonts({
    Anton_400Regular,
    DMSans_400Regular,
    DMSans_400Regular_Italic,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  // If fonts fail to load, carry on with system fonts rather than staying on the splash screen.
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <ThemeProvider value={darkTheme}>
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
