import { AlpacaClient } from "./AlpacaClient";
import * as dotenv from "dotenv";
dotenv.config();

import * as api from "./api";
import * as account from "./resources/account";
import * as position from "./resources/position";
import * as calendar from "./resources/calendar";
import * as clock from "./resources/clock";
import * as asset from "./resources/asset";
import * as order from "./resources/order";
import * as watchlist from "./resources/watchlist";

import * as dataV2 from "./resources/datav2/rest_v2";
import * as entityV2 from "./resources/datav2/entityv2";
import * as crypto_websocket from "./resources/datav2/crypto_websocket_v1beta3";
import * as news_stream from "./resources/datav2/news_websocket";
import * as websockets_v2 from "./resources/datav2/stock_websocket_v2";
import * as option_stream from "./resources/datav2/option_websocket_v1beta1";

import * as websockets from "./resources/websockets";

interface AlpacaConfig {
  keyId: string;
  secretKey: string;
  paper?: boolean;
  baseUrl?: string;
  dataBaseUrl?: string;
  dataStreamUrl?: string;
  apiVersion?: string;
  oauth?: string;
  feed?: string;
  optionFeed?: string;
  verbose?: boolean;
}

class Alpaca implements AlpacaClient {
  configuration: any;
  data_ws: any;
  trade_ws: any;
  data_stream_v2: any;
  adjustment: any;
  timeframeUnit: any;
  crypto_stream_v1beta3: any;
  news_stream: any;
  option_stream: any;
  constructor(config: AlpacaConfig) {
    this.configuration = {
      baseUrl:
        config.baseUrl ||
        process.env.APCA_API_BASE_URL ||
        (config.paper
          ? "https://paper-api.alpaca.markets"
          : "https://api.alpaca.markets"),
      dataBaseUrl:
        config.dataBaseUrl ||
        process.env.APCA_DATA_BASE_URL ||
        process.env.DATA_PROXY_WS ||
        "https://data.alpaca.markets",
      dataStreamUrl:
        config.dataStreamUrl ||
        process.env.APCA_API_STREAM_URL ||
        "https://stream.data.alpaca.markets",
      keyId: config.keyId || process.env.APCA_API_KEY_ID || "",
      secretKey: config.secretKey || process.env.APCA_API_SECRET_KEY || "",
      apiVersion: config.apiVersion || process.env.APCA_API_VERSION || "v2",
      oauth: config.oauth || process.env.APCA_API_OAUTH || "",
      feed: config.feed || "iex", // use 'sip' if you have PRO subscription
      optionFeed: config.optionFeed || "indicative", // use 'opra' if you have PRO subscription
      verbose: config.verbose,
    };
    this.data_ws = new websockets.AlpacaStreamClient({
      url: this.configuration.dataBaseUrl,
      apiKey: this.configuration.keyId,
      secretKey: this.configuration.secretKey,
      oauth: this.configuration.oauth,
    });
    this.data_ws.STATE = websockets.STATE;
    this.data_ws.EVENT = websockets.EVENT;
    this.data_ws.ERROR = websockets.ERROR;

    this.trade_ws = new websockets.AlpacaStreamClient({
      url: this.configuration.baseUrl,
      apiKey: this.configuration.keyId,
      secretKey: this.configuration.secretKey,
      oauth: this.configuration.oauth,
    });
    this.trade_ws.STATE = websockets.STATE;
    this.trade_ws.EVENT = websockets.EVENT;
    this.trade_ws.ERROR = websockets.ERROR;

    this.data_stream_v2 = new websockets_v2.AlpacaStocksClient({
      url: this.configuration.dataStreamUrl,
      feed: this.configuration.feed,
      apiKey: this.configuration.keyId,
      secretKey: this.configuration.secretKey,
      verbose: this.configuration.verbose,
    });

    this.adjustment = dataV2.Adjustment;
    this.timeframeUnit = entityV2.TimeFrameUnit;
    this.crypto_stream_v1beta3 = new crypto_websocket.AlpacaCryptoClient({
      url: this.configuration.dataStreamUrl,
      apiKey: this.configuration.keyId,
      secretKey: this.configuration.secretKey,
      verbose: this.configuration.verbose,
    });

    this.news_stream = new news_stream.AlpacaNewsCLient({
      url: this.configuration.dataStreamUrl,
      apiKey: this.configuration.keyId,
      secretKey: this.configuration.secretKey,
      verbose: this.configuration.verbose,
    });

    this.option_stream = new option_stream.AlpacaOptionClient({
      url: this.configuration.dataStreamUrl,
      feed: this.configuration.optionFeed,
      apiKey: this.configuration.keyId,
      secretKey: this.configuration.secretKey,
      verbose: this.configuration.verbose,
    });
  }

  // Helper methods
  httpRequest = api.httpRequest.bind(this);
  dataHttpRequest = api.dataHttpRequest;
  sendRequest(endpoint: string, queryParams?: any, body?: any, method?: string) {
    return api.sendRequest(this.httpRequest, endpoint, queryParams, body, method);
  }

  // Account
  getAccount = account.get;
  updateAccountConfigurations = account.updateConfigs;
  getAccountConfigurations = account.getConfigs;
  getAccountActivities = account.getActivities;
  getPortfolioHistory = account.getPortfolioHistory;

  // Positions
  getPositions = position.getAll;
  getPosition = position.getOne;
  closeAllPositions = position.closeAll;
  closePosition = position.closeOne;

  // Calendar
  getCalendar = calendar.get;

  // Clock
  getClock = clock.get;

  // Asset
  getAssets = asset.getAll;
  getAsset = asset.getOne;

  // Order
  getOrders = order.getAll;
  getOrder = order.getOne;
  getOrderByClientId = order.getByClientOrderId;
  createOrder = order.post;
  replaceOrder = order.patchOrder;
  cancelOrder = order.cancel;
  cancelAllOrders = order.cancelAll;

  //DataV2
  getTradesV2(symbol: string, options: any, config = this.configuration) {
    return dataV2.getTrades(symbol, options, config);
  }
  getMultiTradesV2(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getMultiTrades(symbols, options, config);
  }
  getMultiTradesAsyncV2(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getMultiTradesAsync(symbols, options, config);
  }
  getQuotesV2(symbol: string, options: any, config = this.configuration) {
    return dataV2.getQuotes(symbol, options, config);
  }
  getMultiQuotesV2(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getMultiQuotes(symbols, options, config);
  }
  getMultiQuotesAsyncV2(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getMultiQuotesAsync(symbols, options, config);
  }
  getBarsV2(symbol: string, options: any, config = this.configuration) {
    return dataV2.getBars(symbol, options, config);
  }
  getMultiBarsV2(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getMultiBars(symbols, options, config);
  }
  getMultiBarsAsyncV2(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getMultiBarsAsync(symbols, options, config);
  }
  getLatestTrade(symbol: string, config = this.configuration) {
    return dataV2.getLatestTrade(symbol, config);
  }
  getLatestTrades(symbols: string[], config = this.configuration) {
    return dataV2.getLatestTrades(symbols, config);
  }
  getLatestQuote(symbol: string, config = this.configuration) {
    return dataV2.getLatestQuote(symbol, config);
  }
  getLatestQuotes(symbols: string[], config = this.configuration) {
    return dataV2.getLatestQuotes(symbols, config);
  }
  getLatestBar(symbol: string, config = this.configuration) {
    return dataV2.getLatestBar(symbol, config);
  }
  getLatestBars(symbols: string[], config = this.configuration) {
    return dataV2.getLatestBars(symbols, config);
  }
  getSnapshot(symbol: string, config = this.configuration) {
    return dataV2.getSnapshot(symbol, config);
  }
  getSnapshots(symbols: string[], config = this.configuration) {
    return dataV2.getSnapshots(symbols, config);
  }
  getCryptoTrades(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getCryptoTrades(symbols, options, config);
  }
  getCryptoQuotes(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getCryptoQuotes(symbols, options, config);
  }
  getCryptoBars(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getCryptoBars(symbols, options, config);
  }
  getLatestCryptoTrades(symbols: string[], config = this.configuration) {
    return dataV2.getLatestCryptoTrades(symbols, config);
  }
  getLatestCryptoQuotes(symbols: string[], config = this.configuration) {
    return dataV2.getLatestCryptoQuotes(symbols, config);
  }
  getLatestCryptoBars(symbols: string[], config = this.configuration) {
    return dataV2.getLatestCryptoBars(symbols, config);
  }
  getCryptoSnapshots(symbols: string[], config = this.configuration) {
    return dataV2.getCryptoSnapshots(symbols, config);
  }
  getCryptoOrderbooks(symbols: string[], config = this.configuration) {
    return dataV2.getLatestCryptoOrderbooks(symbols, config);
  }
  getOptionBars(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getMultiOptionBars(symbols, options, config);
  }
  getOptionTrades(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getMultiOptionTrades(symbols, options, config);
  }
  getOptionLatestTrades(symbols: string[], config = this.configuration) {
    return dataV2.getLatestOptionTrades(symbols, config);
  }
  getOptionLatestQuotes(symbols: string[], config = this.configuration) {
    return dataV2.getLatestOptionQuotes(symbols, config);
  }
  getOptionSnapshots(symbols: string[], config = this.configuration) {
    return dataV2.getOptionSnapshots(symbols, config);
  }
  getOptionChain(underlying_symbol: string, options: any, config = this.configuration) {
    return dataV2.getOptionChain(underlying_symbol, options, config);
  }
  getCorporateActions(symbols: string[], options: any, config = this.configuration) {
    return dataV2.getCorporateActions(symbols, options, config);
  }
  getNews(options: any, config = this.configuration) {
    return dataV2.getNews(options, config);
  }
  newTimeframe(amount: number, unit: entityV2.TimeFrameUnit) {
    return entityV2.NewTimeframe(amount, unit);
  }

  // Watchlists
  getWatchlists = watchlist.getAll;
  getWatchlist = watchlist.getOne;
  addWatchlist = watchlist.addWatchlist;
  addToWatchlist = watchlist.addToWatchlist;
  updateWatchlist = watchlist.updateWatchlist;
  deleteWatchlist = watchlist.deleteWatchlist;
  deleteFromWatchlist = watchlist.deleteFromWatchlist;
}

export default Alpaca;
