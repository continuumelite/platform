import { Stack } from 'expo-router';

import { BrandFonts, Colors } from '@/constants/theme';

const theme = Colors.dark;

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.cream,
        headerTitleStyle: { fontFamily: BrandFonts.semibold },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="more/[tool]" options={{ headerShown: true }} />
    </Stack>
  );
}
