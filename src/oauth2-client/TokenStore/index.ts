import {Storable} from "../types";

export interface TokenStore extends Storable {
  save: (tokens: Storable) => void;
}
