import { omitBy, isNil } from "lodash";
import { AlpacaClient } from "../AlpacaClient";

export interface OrderLeg {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  filled_avg_price: string | null;
  status: string;
  extended_hours: boolean;
  legs: any[] | null; // Can be OrderLeg[] if nested
}

export interface Order {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional?: string | null; // Added notional property
  qty: string;
  filled_qty: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  filled_avg_price: string | null;
  status: string;
  extended_hours: boolean;
  legs: OrderLeg[] | null; // Changed to OrderLeg[]
  order_class: "simple" | "oco" | "oto" | "bracket"; // Added order_class
}

interface OrderBase {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
  time_in_force: "day" | "gtc" | "opg" | "cls" | "ioc" | "fok";
  client_order_id?: string;
  extended_hours?: boolean;
  order_class?: "simple" | "oco" | "oto" | "bracket";
}

export interface OrderWithQty extends OrderBase {
  qty: number;
  notional?: never; // Ensures notional is not present
}

export interface OrderWithNotional extends OrderBase {
  notional: number;
  qty?: never; // Ensures qty is not present
}

export type OrderRequestBody = OrderWithQty | OrderWithNotional;

export type MarketOrderRequestBody = OrderBase & { type: "market" } & (
    | OrderWithQty
    | OrderWithNotional
  );

export type LimitOrderRequestBody = OrderBase & {
  type: "limit" | "stop_limit";
  limit_price: number;
} & (OrderWithQty | OrderWithNotional);

export type StopOrderRequestBody = OrderBase & {
  type: "stop" | "stop_limit";
  stop_price: number;
} & (OrderWithQty | OrderWithNotional);

export type TrailingStopOrderRequestBody = OrderBase & {
  type: "trailing_stop";
  trail_price?: number;
  trail_percent?: number;
} & (OrderWithQty | OrderWithNotional);

export interface TakeProfitLoss {
  limit_price?: number;
  stop_price?: number;
}

export type BracketOrderRequestBody = OrderBase & {
  order_class: "bracket";
  take_profit?: TakeProfitLoss;
  stop_loss?: TakeProfitLoss;
} & (OrderWithQty | OrderWithNotional);

export function getAll(
  this: AlpacaClient,
  {
    status,
    until,
    after,
    limit,
    direction,
    nested,
    symbols,
  }: {
    status?: string;
    until?: string;
    after?: string;
    limit?: number;
    direction?: string;
    nested?: boolean;
    symbols?: string[];
  } = {}
): Promise<Order[]> {
  const queryParams = omitBy(
    {
      status,
      until,
      after,
      limit,
      direction,
      nested,
      symbols,
    },
    isNil
  );
  return this.sendRequest("/orders", queryParams);
}

export function getOne(this: AlpacaClient, id: string): Promise<Order> {
  return this.sendRequest("/orders/" + id);
}

export function getByClientOrderId(
  this: AlpacaClient,
  clientOrderId: string
): Promise<Order> {
  const queryParams = { client_order_id: clientOrderId };
  return this.sendRequest("/orders:by_client_order_id", queryParams);
}

export function post(
  this: AlpacaClient,
  order: OrderRequestBody
): Promise<Order> {
  return this.sendRequest("/orders", null, order, "POST");
}

export function cancel(this: AlpacaClient, id: string): Promise<Order> {
  return this.sendRequest("/orders/" + id, null, null, "DELETE");
}

export function cancelAll(this: AlpacaClient): Promise<Order[]> {
  return this.sendRequest("/orders", null, null, "DELETE");
}

export function patchOrder(
  this: AlpacaClient,
  id: string,
  newOrder: OrderRequestBody
): Promise<Order> {
  return this.sendRequest(`/orders/${id}`, null, newOrder, "PATCH");
}