export interface GoogleToken {
  access_token: string;
  expires_in?: number;
  expiry_date?: number; // units matches `Date().getTime()`
  refresh_token: string;
}

