/**
 * this example shows how to use the alpaca data websocket to subscribe to
 * events. no trading will be done here but you could easily use long-short.js
 * to add trading logic to this example too
 */

import Alpaca from "../lib/alpaca-trade-api";

const API_KEY = "<YOUR_API_KEY>";
const API_SECRET = "<YOUR_API_SECRET>";

interface WebsocketSubscriberConfig {
  keyId: string;
  secretKey: string;
  paper?: boolean;
}

interface StockTrade {
  price: number;
  // Add other trade properties
}

interface StockQuote {
  bidprice: number;
  askprice: number;
  // Add other quote properties
}

interface StockAgg {
  // Add aggregation properties
}

interface OrderUpdate {
  // Add order update properties
}

interface AccountUpdate {
  // Add account update properties
}

class WebsocketSubscriber {
  alpaca: Alpaca;

  constructor({ keyId, secretKey, paper = true }: WebsocketSubscriberConfig) {
    this.alpaca = new Alpaca({
      keyId: keyId,
      secretKey: secretKey,
      paper: paper,
    });

    const data_client = this.alpaca.data_ws;
    data_client.onConnect(function () {
      console.log("Connected");
      const keys = [
        "alpacadatav1/T.FB",
        "alpacadatav1/Q.AAPL",
        "alpacadatav1/AM.AAPL",
        "alpacadatav1/AM.FB",
      ];
      data_client.subscribe(keys);
    });
    data_client.onDisconnect(() => {
      console.log("Disconnected");
    });
    data_client.onStateChange((newState: string) => {
      console.log(`State changed to ${newState}`);
    });
    data_client.onStockTrades(function (subject: string, data: StockTrade) {
      console.log(`Stock trades: ${subject}, price: ${data.price}`);
    });
    data_client.onStockQuotes(function (subject: string, data: StockQuote) {
      console.log(
        `Stock quotes: ${subject}, bid: ${data.bidprice}, ask: ${data.askprice}`
      );
    });
    data_client.onStockAggSec(function (subject: string, data: StockAgg) {
      console.log(`Stock agg sec: ${subject}, ${data}`);
    });
    data_client.onStockAggMin(function (subject: string, data: StockAgg) {
      console.log(`Stock agg min: ${subject}, ${data}`);
    });
    data_client.connect();

    const updates_client = this.alpaca.trade_ws;
    updates_client.onConnect(function () {
      console.log("Connected");
      const trade_keys = ["trade_updates", "account_updates"];
      updates_client.subscribe(trade_keys);
    });
    updates_client.onDisconnect(() => {
      console.log("Disconnected");
    });
    updates_client.onStateChange((newState: string) => {
      console.log(`State changed to ${newState}`);
    });
    updates_client.onOrderUpdate((data: OrderUpdate) => {
      console.log(`Order updates: ${JSON.stringify(data)}`);
    });
    updates_client.onAccountUpdate((data: AccountUpdate) => {
      console.log(`Account updates: ${JSON.stringify(data)}`);
    });
    updates_client.connect();
  }
}

// Run the LongShort class
let ls = new WebsocketSubscriber({
  keyId: API_KEY,
  secretKey: API_SECRET,
  paper: true,
});