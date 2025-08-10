interface AlpacaQuote {
  symbol: string;
  askexchange: string;
  askprice: number;
  asksize: number;
  bidexchange: string;
  bidprice: number;
  bidsize: number;
  conditions: string[];
  timestamp: number;
}

interface AlpacaTrade {
  symbol: string;
  tradeID: number;
  exchange: string;
  price: number;
  size: number;
  timestamp: number;
  tapeID: string;
  conditions: string[];
}

interface AggMinuteBar {
  symbol: string;
  volume: number;
  accumulatedVolume: number;
  officialOpenPrice: number;
  vwap: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  averagePrice: number;
  startEpochTime: number;
  endEpochTime: number;
}

interface Bar {
  startEpochTime: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: number;
}

const alpaca_quote_mapping: { [key: string]: string } = {
  T: "symbol",
  X: "askexchange",
  P: "askprice",
  S: "asksize",
  x: "bidexchange",
  p: "bidprice",
  s: "bidsize",
  c: "conditions",
  t: "timestamp",
};

const alpaca_trade_mapping: { [key: string]: string } = {
  T: "symbol",
  i: "tradeID",
  x: "exchange",
  p: "price",
  s: "size",
  t: "timestamp", // in millisecond
  z: "tapeID",
  c: "conditions",
};

const alpaca_agg_minute_bar_mapping: { [key: string]: string } = {
  T: "symbol",
  v: "volume",
  av: "accumulatedVolume",
  op: "officialOpenPrice",
  vw: "vwap",
  o: "openPrice",
  h: "highPrice",
  l: "lowPrice",
  c: "closePrice",
  a: "averagePrice",
  s: "startEpochTime",
  e: "endEpochTime",
};

const alpaca_bar_mapping: { [key: string]: string } = {
  t: "startEpochTime", // in seconds
  o: "openPrice",
  h: "highPrice",
  l: "lowPrice",
  c: "closePrice",
  v: "volume",
};

function convert(data: any, mapping: { [key: string]: string }): any {
  const obj: { [key: string]: any } = {};
  for (let [key, value] of Object.entries(data)) {
    if (mapping.hasOwnProperty(key)) {
      obj[mapping[key]] = value;
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

export function AlpacaQuote(data: any): AlpacaQuote {
  return convert(data, alpaca_quote_mapping);
}

export function AlpacaTrade(data: any): AlpacaTrade {
  return convert(data, alpaca_trade_mapping);
}

export function AggMinuteBar(data: any): AggMinuteBar {
  return convert(data, alpaca_agg_minute_bar_mapping);
}

export function Bar(data: any): Bar {
  return convert(data, alpaca_bar_mapping);
}