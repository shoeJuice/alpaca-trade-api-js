import { AlpacaClient } from "../AlpacaClient";

interface Asset {
  // Add asset properties here
}

export function getAll(this: AlpacaClient, options = {}): Promise<Asset[]> {
  return this.sendRequest("/assets", options);
}

export function getOne(this: AlpacaClient, symbol: string): Promise<Asset> {
  return this.sendRequest("/assets/" + symbol);
}