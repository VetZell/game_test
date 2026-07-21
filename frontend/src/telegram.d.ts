export {}

declare global {
  interface TelegramWebAppUser {
    id: number
    first_name: string
    last_name?: string
    username?: string
    language_code?: string
  }

  interface TelegramHapticFeedback {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
    notificationOccurred(type: 'error' | 'success' | 'warning'): void
    selectionChanged(): void
  }

  interface TelegramWebApp {
    initData: string
    initDataUnsafe: { user?: TelegramWebAppUser }
    colorScheme: 'light' | 'dark'
    HapticFeedback?: TelegramHapticFeedback
    ready(): void
    expand(): void
    setHeaderColor(color: string): void
    setBackgroundColor(color: string): void
  }

  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}
