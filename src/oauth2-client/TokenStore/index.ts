import {TokenRecord} from "../types";

export type Storable = Pick<TokenRecord, 'access_token' | 'refresh_token' | 'expiry_date'>

export interface TokenStore extends Storable {
  save: (tokens: Storable) => void;
}
