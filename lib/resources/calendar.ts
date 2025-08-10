import { omitBy, isNil } from "lodash";
import { toDateString } from "../utils/dateformat";
import { AlpacaClient } from "../AlpacaClient";

export interface Calendar {
  date: string;
  open: string;
  close: string;
  session_open: string;
  session_close: string;
}

export function get(this: AlpacaClient, { start, end }: { start?: Date, end?: Date } = {}): Promise<Calendar[]> {
  const queryParams = omitBy(
    {
      start: start ? toDateString(start) : undefined,
      end: end ? toDateString(end) : undefined,
    },
    isNil
  );
  return this.sendRequest("/calendar", queryParams);
}