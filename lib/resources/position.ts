import { AlpacaClient } from "../AlpacaClient";
import { Order } from "./order";

export interface Position {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  qty_available: string;
  side: "long" | "short";
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
  asset_marginable: boolean;
}

export interface ClosePositionResponse {
  symbol: string;
  status: number;
  body: Order; // Assuming the body contains an Order object
}

export function getAll(this: AlpacaClient): Promise<Position[]> {
  return this.sendRequest("/positions");
}

export function getOne(this: AlpacaClient, symbol: string): Promise<Position> {
  return this.sendRequest("/positions/" + symbol);
}

export function closeAll(this: AlpacaClient): Promise<ClosePositionResponse[]> {
  return this.sendRequest("/positions", null, null, "DELETE");
}

export function closeOne(this: AlpacaClient, symbol: string): Promise<ClosePositionResponse> {
  return this.sendRequest("/positions/" + symbol, null, null, "DELETE");
}