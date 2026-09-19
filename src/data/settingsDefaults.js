/**
 * Starting values and option lists for the Settings page. Settings are entirely separate from the
 * business datasets (orders, customers, products, inventory): nothing here is read by them.
 */

export const DEFAULT_SETTINGS = {
  general: {
    businessName: 'Nexa Trading Co.',
    businessEmail: 'hello@nexa.example',
    currency: 'USD',
    timeZone: 'America/New_York',
  },
  notifications: {
    orders: true,
    lowStock: true,
    customerActivity: false,
    email: true,
  },
  appearance: {
    theme: 'dark',
    reduceMotion: false,
  },
}

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
]

export const TIME_ZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Berlin', label: 'Central European Time (Berlin)' },
  { value: 'Asia/Dubai', label: 'Gulf Time (Dubai)' },
  { value: 'Asia/Karachi', label: 'Pakistan Time (Karachi)' },
  { value: 'Asia/Kolkata', label: 'India Time (Kolkata)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Japan Time (Tokyo)' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time (Auckland)' },
]

/** "System" follows the operating system's light or dark setting, live. */
export const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark', hint: 'The Nexa default.' },
  { value: 'system', label: 'System', hint: 'Matches your device’s light or dark setting.' },
  { value: 'light', label: 'Light', hint: 'A bright workspace for well-lit rooms.' },
]

export const NOTIFICATION_OPTIONS = [
  { key: 'orders', label: 'Order notifications', description: 'New orders and changes to an order’s status.' },
  { key: 'lowStock', label: 'Low-stock alerts', description: 'When a product reaches its low-stock threshold or runs out.' },
  { key: 'customerActivity', label: 'Customer activity', description: 'New customers and repeat buyers.' },
  { key: 'email', label: 'Email notifications', description: 'Also send notifications by email.' },
]

/**
 * The signed-in admin shown on the Account section. Frontend-only: there is no sign-in, so this is
 * a fixed demo profile (an .example address, which can never be a real mailbox).
 */
export const ADMIN_ACCOUNT = {
  name: 'Jordan Ellis',
  email: 'jordan.ellis@nexa.example',
  role: 'Administrator',
  access: 'Full access to every area of the workspace',
  memberSince: '2026-01-12T00:00:00.000Z',
}
