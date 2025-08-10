/**
 * This example shows how to use the Alpaca Data V2 websocket to subscribe to events.
 * The socket is available under the `data_steam_v2` property on an Alpaca instance.
 * There are separate functions for subscribing (and unsubscribing) to trades, quotes and bars as seen below.
 */

import Alpaca from "../lib/alpaca-trade-api";

const API_KEY = "<YOUR_API_KEY>";
const API_SECRET = "<YOUR_API_SECRET>";

interface DataStreamConfig {
  apiKey: string;
  secretKey: string;
  feed: string;
  paper?: boolean;
}

interface Trade {
  // Define trade properties
}

interface Quote {
  // Define quote properties
}

interface Bar {
  // Define bar properties
}

interface Status {
  // Define status properties
}

class DataStream {
  alpaca: Alpaca;

  constructor({ apiKey, secretKey, feed, paper }: DataStreamConfig) {
    this.alpaca = new Alpaca({
      keyId: apiKey,
      secretKey,
      feed,
      paper,
    });

    const socket = this.alpaca.data_stream_v2;

    socket.onConnect(() => {
      console.log("Connected");
      socket.subscribeForQuotes(["AAPL"]);
      socket.subscribeForTrades(["FB"]);
      socket.subscribeForBars(["SPY"]);
      socket.subscribeForStatuses(["*"]);
    });

    socket.onError((err: Error) => {
      console.log(err);
    });

    socket.onStockTrade((trade: Trade) => {
      console.log(trade);
    });

    socket.onStockQuote((quote: Quote) => {
      console.log(quote);
    });

    socket.onStockBar((bar: Bar) => {
      console.log(bar);
    });

    socket.onStatuses((s: Status) => {
      console.log(s);
    });

    socket.onStateChange((state: any) => {
      console.log(state);
    });

    socket.onDisconnect(() => {
      console.log("Disconnected");
    });

    socket.connect();

    // unsubscribe from FB after a second
    setTimeout(() => {
      socket.unsubscribeFromTrades(["FB"]);
    }, 1000);
  }
}

let stream = new DataStream({
  apiKey: API_KEY,
  secretKey: API_SECRET,
  feed: "sip",
  paper: true,
});