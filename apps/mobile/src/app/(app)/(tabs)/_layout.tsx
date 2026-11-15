import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';

import { HeaderLogo } from '@/components/brand';
import { BrandFonts, Colors } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const theme = Colors.dark;

/** The brief's mobile shell: exactly five bottom tabs, with the logo at the top. */
const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'training', title: 'Training', icon: 'calendar-outline', activeIcon: 'calendar' },
  { name: 'nutrition', title: 'Nutrition', icon: 'nutrition-outline', activeIcon: 'nutrition' },
  { name: 'dashboard', title: 'Dashboard', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { name: 'more', title: 'More', icon: 'ellipsis-horizontal', activeIcon: 'ellipsis-horizontal' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitle: () => <HeaderLogo />,
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: theme.background, borderBottomColor: theme.rule },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.rule },
        tabBarActiveTintColor: theme.cream,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontFamily: BrandFonts.medium, fontSize: 11 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={focused ? tab.activeIcon : tab.icon}
                color={String(color)}
                size={size - 2}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
