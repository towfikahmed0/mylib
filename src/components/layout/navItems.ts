import {
  Activity,
  Bell,
  BookMarked,
  Compass,
  Layers,
  Library,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  inMobileNav: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Library', to: '/library', icon: Library, inMobileNav: true },
  { label: 'My Books', to: '/mybooks', icon: BookMarked, inMobileNav: true },
  { label: 'Shelves', to: '/shelves', icon: Layers, inMobileNav: false },
  { label: 'Explore', to: '/explore', icon: Compass, inMobileNav: true },
  { label: 'Activity', to: '/activity', icon: Activity, inMobileNav: false },
  { label: 'Notifications', to: '/notifications', icon: Bell, inMobileNav: false },
  { label: 'Insights', to: '/insights', icon: Sparkles, inMobileNav: true },
  { label: 'Settings', to: '/settings', icon: Settings, inMobileNav: false },
]

export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter((item) => item.inMobileNav)
