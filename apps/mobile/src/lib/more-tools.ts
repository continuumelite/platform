import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Everything that lives under the More tab (brief, slide 4). None are built yet. */
export const MORE_TOOLS: { slug: string; title: string; icon: IconName; blurb: string }[] = [
  {
    slug: 'coach',
    title: 'Coach hub',
    icon: 'chatbubbles-outline',
    blurb: 'Messages and check-ins with your coach.',
  },
  {
    slug: 'community',
    title: 'Community',
    icon: 'people-outline',
    blurb: 'Posts and updates from the Continuum team.',
  },
  {
    slug: 'events',
    title: 'Events',
    icon: 'flag-outline',
    blurb: 'Races, camps and group sessions.',
  },
  {
    slug: 'map',
    title: 'Map',
    icon: 'map-outline',
    blurb: 'Routes and where the group is training.',
  },
  {
    slug: 'fitness',
    title: 'Fitness scores',
    icon: 'pulse-outline',
    blurb: 'Fitness, fatigue and form over time.',
  },
  {
    slug: 'predictions',
    title: 'Race predictions',
    icon: 'stopwatch-outline',
    blurb: 'Predicted times from your recent training.',
  },
  {
    slug: 'devices',
    title: 'Devices',
    icon: 'watch-outline',
    blurb: 'Connect Strava or your watch to bring in workouts and health data.',
  },
  {
    slug: 'meals',
    title: 'Saved meals',
    icon: 'restaurant-outline',
    blurb: 'Meals you log often, one tap to add.',
  },
  { slug: 'merch', title: 'Merch', icon: 'shirt-outline', blurb: 'Continuum kit and gear.' },
  {
    slug: 'upgrade',
    title: 'Upgrade',
    icon: 'star-outline',
    blurb: 'Plans and coaching packages.',
  },
];
