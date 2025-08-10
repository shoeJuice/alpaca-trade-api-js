import { AlpacaClient } from "../AlpacaClient";

export interface Clock {
  // Add clock properties here
}

export function get(this: AlpacaClient): Promise<Clock> {
  return this.sendRequest("/clock");
}