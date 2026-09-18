import {
  BarChart3,
  LayoutDashboard,
  Package,
  Settings as SettingsIcon,
  ShoppingCart,
  Users,
  Warehouse,
} from 'lucide-react'

export const NAV_ITEMS = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Orders', path: '/orders', icon: ShoppingCart },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'Inventory', path: '/inventory', icon: Warehouse },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
]

export const SECONDARY_NAV_ITEMS = [
  { label: 'Settings', path: '/settings', icon: SettingsIcon },
]
