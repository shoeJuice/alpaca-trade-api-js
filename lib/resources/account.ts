import { omitBy, isNil } from "lodash";
import { AlpacaClient } from "../AlpacaClient";

export interface Account {
  // Add account properties here
}

export interface AccountConfigurations {
  // Add account configurations properties here
}

export interface Activity {
  // Add activity properties here
}

export interface PortfolioHistory {
  // Add portfolio history properties here
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