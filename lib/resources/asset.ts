import { AlpacaClient } from "../AlpacaClient";
import { omitBy, isNil } from "lodash";

export interface Asset {
  id: string;
  class: string;
  cusip?: string | null;
  exchange: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
  margin_requirement_long: string;
  margin_requirement_short: string;
  attributes: string[];
}

export interface AssetMetadata {
  status?: string;
  asset_class?: string;
  exchange?: string;
  attributes?: string[];
}

export interface TreasuryMetadata {
  subtype: string;
  bond_status: string;
  cusips: string[];
  isins: string[];
}

export interface TreasuryResponse {
  cusip: string;
  isin: string;
  bond_status: string;
  tradable: boolean;
  subtype: string;
  issue_date: string;
  maturity_date: string;
  description: string;
  description_short: string;
  close_price?: number;
  close_price_date?: string;
  close_yield_to_maturity?: number;
  close_yield_to_worst?: number;
  coupon: number;
  coupon_type: string;
  coupon_frequency: string;
  first_coupon_date?: string;
  next_coupon_date?: string;
  last_coupon_date?: string;
}

export interface OptionsContractRequest {
  underlying_symbols: string;
  show_deliverables: boolean;
  status: string;
  expiration_date: string;
  expiration_date_gte: string;
  expiration_date_lte: string;
  root_symbol: string;
  type: string;
  style: string;
  strike_price_gte: number;
  strike_price_lte: number;
  page_token: string;
  limit: number;
  ppind: boolean;
}

export interface OptionDeliverable {
  type: string;
  symbol: string;
  asset_id: string;
  amount: string;
  allocation_percentage: string;
  settlement_type: string;
  settlement_method: string;
  delayed_settlement: boolean;
}

export interface OptionsContract {
  id: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  expiration_date: string;
  root_symbol: string;
  underlying_symbol: string;
  underlying_asset_id: string;
  type: string;
  style: string;
  strike_price: number;
  multiplier: number;
  size: string;
  open_interest: string;
  open_interest_date: string;
  close_price: string;
  close_price_date: string;
  deliverables: OptionDeliverable[];
  next_page_token?: string | null;
}

export function getAll(this: AlpacaClient, options = {}): Promise<Asset[]> {
  return this.sendRequest("/assets", options);
}

export function getOne(this: AlpacaClient, symbol: string): Promise<Asset> {
  return this.sendRequest("/assets/" + symbol);
}

export function getUSTreasuries(
  this: AlpacaClient,
  metadata?: TreasuryMetadata
): Promise<TreasuryResponse[]> {
  const queryParams = omitBy(
    {
      cusips: metadata?.cusips?.join(","),
      isins: metadata?.isins?.join(","),
      subtype: metadata?.subtype,
      bond_status: metadata?.bond_status,
    },
    isNil
  );
  return this.sendRequest("/assets/fixed_income/us_treasuries", queryParams);
}

export function getOptionsContracts(
  this: AlpacaClient,
  request: OptionsContractRequest
): Promise<OptionsContract[]> {
  const queryParams = omitBy(
    {
      underlying_symbols: request.underlying_symbols,
      show_deliverables: request.show_deliverables,
      status: request.status,
      expiration_date: request.expiration_date,
      expiration_date_gte: request.expiration_date_gte,
      expiration_date_lte: request.expiration_date_lte,
      root_symbol: request.root_symbol,
      type: request.type,
      style: request.style,
      strike_price_gte: request.strike_price_gte,
      strike_price_lte: request.strike_price_lte,
      page_token: request.page_token,
      limit: request.limit,
      ppind: request.ppind,
    },
    isNil
  );
  return this.sendRequest("/assets/options", queryParams);
}

export function getOptionContract(
  this: AlpacaClient,
  idOrSymbol: string
): Promise<OptionsContract> {
  return this.sendRequest("/assets/options/" + idOrSymbol);
}
