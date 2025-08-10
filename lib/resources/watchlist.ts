import { AlpacaClient } from "../AlpacaClient";
import { Position } from "./position"; // Reusing Position interface for Asset properties

export interface Asset extends Position {
  // Asset properties are covered by Position interface, 
  // but you can add more specific asset properties here if needed
}

export interface Watchlist {
  id: string;
  account_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  assets: Asset[];
}

export function getAll(this: AlpacaClient): Promise<Watchlist[]> {
  return this.sendRequest("/watchlists");
}

export function getOne(this: AlpacaClient, id: string): Promise<Watchlist> {
  return this.sendRequest(`/watchlists/${id}`);
}

export function addWatchlist(this: AlpacaClient, name: string, symbols: string[] = []): Promise<Watchlist> {
  const body = { name: name, symbols: symbols };
  return this.sendRequest("/watchlists", null, body, "POST");
}

export function addToWatchlist(this: AlpacaClient, id: string, symbol: string): Promise<Watchlist> {
  const body = { symbol: symbol };
  return this.sendRequest(`/watchlists/${id}`, null, body, "POST");
}

export function updateWatchlist(this: AlpacaClient, id: string, newWatchList: { name?: string, symbols?: string[] }): Promise<Watchlist> {
  return this.sendRequest(`/watchlists/${id}`, null, newWatchList, "PUT");
}

export function deleteWatchlist(this: AlpacaClient, id: string): Promise<any> {
  return this.sendRequest(`/watchlists/${id}`, null, null, "DELETE");
}

export function deleteFromWatchlist(this: AlpacaClient, id: string, symbol: string): Promise<any> {
  return this.sendRequest(`/watchlists/${id}/${symbol}`, null, null, "DELETE");
}
