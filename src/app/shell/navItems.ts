import {
  CalendarClock,
  House,
  Megaphone,
  Settings,
  Users,
  Waypoints,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { de } from '@/i18n/de';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function navItems(devMode: boolean): NavItem[] {
  const items: NavItem[] = [
    { to: '/dashboard', label: de.nav.dashboard, icon: House },
    { to: '/customers', label: de.nav.customers, icon: Users },
    { to: '/reminders', label: de.nav.reminders, icon: CalendarClock },
    { to: '/campaigns', label: de.nav.campaigns, icon: Megaphone },
    { to: '/network', label: de.nav.network, icon: Waypoints },
    { to: '/settings', label: de.nav.settings, icon: Settings },
  ];
  if (devMode) items.push({ to: '/dev/ui', label: de.nav.dev, icon: Wrench });
  return items;
}
