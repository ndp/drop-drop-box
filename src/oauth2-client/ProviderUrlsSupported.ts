export type ProviderUrls = { authBase: string, token: string };

export const ProviderUrlsSupported: Record<string, ProviderUrls> = {
  Google: {
    authBase: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token"
  },
  Dropbox: {
    authBase: 'https://www.dropbox.com/oauth2/authorize',
    token: 'https://api.dropbox.com/oauth2/token'
  }
} as const

// export type Provider = keyof typeof ProviderUrls
