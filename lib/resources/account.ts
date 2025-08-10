import { omitBy, isNil } from "lodash";
import { AlpacaClient } from "../AlpacaClient";

export interface Account {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  trade_suspended_by_user: boolean;
  multiplier: string;
  shorting_enabled: boolean;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  last_maintenance_margin: string;
  daytrade_count: number;
  sudo_override_dtbp_check: string;
  buying_power: string;
  daytrading_buying_power: string;
  regt_buying_power: string;
  non_marginable_buying_power: string;
  bod_dtbp: string;
  accrued_fees: string;
  pending_transfer_in: string;
  pending_transfer_out: string;
}

export interface AccountConfigurations {
  dtbp_check: string;
  trade_confirm_email: string;
  suspend_trade: boolean;
  no_shorting: boolean;
}

export interface Activity {
  activity_type: string;
  id: string;
  cum_qty: string;
  leaves_qty: string;
  price: string;
  qty: string;
  side: string;
  symbol: string;
  transaction_time: string;
  order_id: string;
  type: string;
  date: string;
  net_amount: string;
  per_share_amount: string;
}

export interface PortfolioHistory {
  timestamp: number[];
  equity: number[];
  profit_loss: number[];
  profit_loss_pct: number[];
  base_value: number;
  timeframe: string;
}

export function get(this: AlpacaClient): Promise<Account> {
  return this.sendRequest("/account");
}

export function updateConfigs(this: AlpacaClient, configs: any): Promise<AccountConfigurations> {
  return this.sendRequest("/account/configurations", null, configs, "PATCH");
}

export function getConfigs(this: AlpacaClient): Promise<AccountConfigurations> {
  return this.sendRequest("/account/configurations");
}

export function getActivities(this: AlpacaClient, {
  activityTypes,
  until,
  after,
  direction,
  date,
  pageSize,
  pageToken,
}: {
  activityTypes?: string | string[];
  until?: string;
  after?: string;
  direction?: string;
  date?: string;
  pageSize?: number;
  pageToken?: string;
}): Promise<Activity[]> {
  if (Array.isArray(activityTypes)) {
    activityTypes = activityTypes.join(",");
  }
  const queryParams = omitBy(
    {
      activity_types: activityTypes,
      until,
      after,
      direction,
      date,
      page_size: pageSize,
      page_token: pageToken,
    },
    isNil
  );
  return this.sendRequest("/account/activities", queryParams);
}

export function getPortfolioHistory(this: AlpacaClient, {
  date_start,
  date_end,
  period,
  timeframe,
  extended_hours,
}: {
  date_start?: string;
  date_end?: string;
  period?: string;
  timeframe?: string;
  extended_hours?: boolean;
}): Promise<PortfolioHistory> {
  const queryParams = omitBy(
    {
      date_start,
      date_end,
      period,
      timeframe,
      extended_hours,
    },
    isNil
  );
  return this.sendRequest("/account/portfolio/history", queryParams);
}