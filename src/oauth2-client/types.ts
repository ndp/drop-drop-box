export interface TokenRecord {
  access_token: string;
  expires_in?: number;
  expiry_date?: number; // units matches `Date().getTime()`; Unix timestamp in milliseconds
  refresh_token: string;
}

export interface TokenResponse {
  res: any;
  tokens: TokenRecord;
}


