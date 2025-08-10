import { AlpacaClient } from "../AlpacaClient";

interface Clock {
  // Add clock properties here
}

export function get(this: AlpacaClient): Promise<Clock> {
  return this.sendRequest("/clock");
}