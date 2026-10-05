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
}

/** Desktop sidebar navigation. Mobile uses a dedicated 4-tab layout. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Library', to: '/library', icon: Library },
  { label: 'My Books', to: '/mybooks', icon: BookMarked },
  { label: 'Shelves', to: '/shelves', icon: Layers },
  { label: 'Explore', to: '/explore', icon: Compass },
  { label: 'Activity', to: '/activity', icon: Activity },
  { label: 'Notifications', to: '/notifications', icon: Bell },
  { label: 'Insights', to: '/insights', icon: Sparkles },
  { label: 'Settings', to: '/settings', icon: Settings },
]
