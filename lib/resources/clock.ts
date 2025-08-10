import { AlpacaClient } from "../AlpacaClient";

export interface Clock {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
}

export function get(this: AlpacaClient): Promise<Clock> {
  return this.sendRequest("/clock");
}