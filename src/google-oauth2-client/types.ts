export interface GoogleToken {
  access_token: string;
  expires_in?: number;
  expiry_date?: number; // units matches `Date().getTime()`; Unix timestamp in milliseconds
  refresh_token: string;
}

export interface GoogleTokenResponse {
  res: any;
  tokens: GoogleToken;
}


export type Storable = Pick<GoogleToken, 'access_token'|'refresh_token'|'expiry_date'>
export interface TokenStore extends Storable {
  save: (tokens: Storable) => void;
}
