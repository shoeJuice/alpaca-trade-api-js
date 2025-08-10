import { omitBy, isNil } from "lodash";
import { toDateString } from "../utils/dateformat";
import { AlpacaClient } from "../AlpacaClient";

interface Calendar {
  // Add calendar properties here
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
