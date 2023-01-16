export type ProviderUrls = { userAuthBase: string, token: string };

export const ProviderUrlsSupported = {
  Google: {
    userAuthBase: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token"
  },
  Dropbox: {
    userAuthBase: 'https://www.dropbox.com/oauth2/authorize',
    token: 'https://api.dropbox.com/oauth2/token'
  }
} as const

export type ProviderKey = keyof typeof ProviderUrlsSupported
