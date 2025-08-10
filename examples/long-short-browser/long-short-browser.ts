import AlpacaCORS from "../../lib/cors-api";
import Chart from "chart.js";
import $ from "jquery";

interface Stock {
  name: string;
  pc: number;
}

interface AlpacaCORSConfig {
  keyId: string;
  secretKey: string;
  baseUrl?: string;
}

interface Order {
  id: string;
  symbol: string;
  qty: string;
  side: string;
  type: string;
  // Add other order properties as needed
}

interface Position {
  qty: string;
  symbol: string;
  side: string;
  unrealized_pl: string;
  market_value: string;
  // Add other position properties as needed
}

interface Clock {
  next_close: string;
  timestamp: string;
  is_open: boolean;
  next_open: string;
}

interface Account {
  equity: string;
  portfolio_value: string;
  buying_power: string;
  // Add other account properties as needed
}

class LongShort {
  alpaca: AlpacaCORS;
  allStocks: Stock[];
  long: string[];
  short: string[];
  qShort: number | null;
  qLong: number | null;
  adjustedQLong: number | null;
  adjustedQShort: number | null;
  blacklist: Set<string>;
  longAmount: number;
  shortAmount: number;
  timeToClose: number | null;
  marketChecker: NodeJS.Timeout | null;
  spin: NodeJS.Timeout | null;
  chart: Chart | null;
  chart_data: any[];
  positions: any[];

  constructor(API_KEY: string, API_SECRET: string) {
    this.alpaca = new AlpacaCORS({
      keyId: API_KEY,
      secretKey: API_SECRET,
      baseUrl: 'https://paper-api.alpaca.markets'
    });

    this.allStocks = ['DOMO', 'TLRY', 'SQ', 'MRO', 'AAPL', 'GM', 'SNAP', 'SHOP', 'SPLK', 'BA', 'AMZN', 'SUI', 'SUN', 'TSLA', 'CGC', 'SPWR', 'NIO', 'CAT', 'MSFT', 'PANW', 'OKTA', 'TWTR', 'TM', 'RTN', 'ATVI', 'GS', 'BAC', 'MS', 'TWLO', 'QCOM'];
    // Format the allStocks variable for use in the class.
    let temp: Stock[] = [];
    this.allStocks.forEach((stockName: string) => {
      temp.push({ name: stockName, pc: 0 });
    });
    this.allStocks = temp.slice();

    this.long = [];
    this.short = [];
    this.qShort = null;
    this.qLong = null;
    this.adjustedQLong = null;
    this.adjustedQShort = null;
    this.blacklist = new Set();
    this.longAmount = 0;
    this.shortAmount = 0;
    this.timeToClose = null;
    this.marketChecker = null;
    this.spin = null;
    this.chart = null;
    this.chart_data = [];
    this.positions = [];
  }

  async run(): Promise<void> {
    // First, cancel any existing orders so they don't impact our buying power.
    let orders: Order[] = [];
    try {
      orders = await this.alpaca.getOrders({
        status: "open",
        direction: "desc"
      });
    } catch (err: any) { writeToEventLog(err); }
    const promOrders: Promise<void>[] = [];
    orders.forEach((order: Order) => {
      promOrders.push(new Promise<void>(async (resolve, reject) => {
        try {
          await this.alpaca.cancelOrder(order.id);
        } catch (err: any) { writeToEventLog(err); }
        resolve();
      }));
    });
    await Promise.all(promOrders);

    // Wait for market to open.
    writeToEventLog("Waiting for market to open...");
    await this.awaitMarketOpen();
    writeToEventLog("Market opened.");

    // Rebalance the portfolio every minute, making necessary trades.
    this.spin = setInterval(async () => {

      // Figure out when the market will close so we can prepare to sell beforehand.
      try {
        const resp: Clock = await this.alpaca.getClock();
        const closingTime = new Date(resp.next_close.substring(0, resp.next_close.length - 6));
        const currTime = new Date(resp.timestamp.substring(0, resp.timestamp.length - 6));
        this.timeToClose = Math.abs(closingTime.getTime() - currTime.getTime());
      } catch (err: any) { writeToEventLog(err); }

      if (this.timeToClose !== null && this.timeToClose < (60000 * 15)) {
        // Close all positions when 15 minutes til market close.
        writeToEventLog("Market closing soon.  Closing positions.");

        try {
          const resp: Position[] = await this.alpaca.getPositions();
          const promClose: Promise<void>[] = [];
          resp.forEach((position: Position) => {
            promClose.push(new Promise<void>(async (resolve, reject) => {
              let orderSide: string;
              if (position.side == 'long') orderSide = 'sell';
              else orderSide = 'buy';
              const quantity = Math.abs(parseFloat(position.qty));
              await this.submitOrder(quantity, position.symbol, orderSide);
              resolve();
            }));
          });

          await Promise.all(promClose);
        } catch (err: any) { writeToEventLog(err); }
        if (this.spin) clearInterval(this.spin);
        writeToEventLog("Sleeping until market close (15 minutes).");
        setTimeout(() => {
          // Run script again after market close for next trading day.
          this.run();
        }, 60000 * 15);
      } else {
        // Rebalance the portfolio.
        await this.rebalance();
        this.updateChart();
      }
    }, 60000);
  }
  // Spin until the market is open.
  async awaitMarketOpen(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      let isOpen = false;
      try {
        const resp: Clock = await this.alpaca.getClock();
        if (resp.is_open) {
          resolve();
        } else {
          this.marketChecker = setInterval(async () => {
            this.updateChart();
            try {
              const resp: Clock = await this.alpaca.getClock();
              isOpen = resp.is_open;
              if (isOpen) {
                if (this.marketChecker) clearInterval(this.marketChecker);
                resolve();
              } else {
                const openTime = new Date(resp.next_open.substring(0, resp.next_close.length - 6));
                const currTime = new Date(resp.timestamp.substring(0, resp.timestamp.length - 6));
                this.timeToClose = Math.floor((openTime.getTime() - currTime.getTime()) / 1000 / 60);
                writeToEventLog(this.timeToClose + " minutes til next market open.");
              }
            } catch (err: any) { writeToEventLog(err); }
          }, 60000);
        }
      } catch (err: any) { writeToEventLog(err); }
    });
  }

  // Rebalance our position after an update.
  async rebalance(): Promise<void> {
    await this.rerank();

    // Clear existing orders again.
    let orders: Order[] = [];
    try {
      orders = await this.alpaca.getOrders({
        status: 'open',
        direction: 'desc'
      });
    } catch (err: any) { writeToEventLog(err); }
    const promOrders: Promise<void>[] = [];
    orders.forEach((order: Order) => {
      promOrders.push(new Promise<void>(async (resolve, reject) => {
        try {
          await this.alpaca.cancelOrder(order.id);
        } catch (err: any) { writeToEventLog(err); }
        resolve();
      }));
    });
    await Promise.all(promOrders);

    writeToEventLog("We are taking a long position in: " + this.long.toString());
    writeToEventLog("We are taking a short position in: " + this.short.toString());
    // Remove positions that are no longer in the short or long list, and make a list of positions that do not need to change.  Adjust position quantities if needed.
    let positions: Position[] = [];
    try {
      positions = await this.alpaca.getPositions();
    } catch (err: any) { writeToEventLog(err); }
    const promPositions: Promise<void>[] = [];
    const executed = { long: [], short: [] };
    let side: string;
    this.blacklist.clear();
    positions.forEach((position: Position) => {
      promPositions.push(new Promise<void>(async (resolve, reject) => {
        if (this.long.indexOf(position.symbol) < 0) {
          // Position is not in long list.
          if (this.short.indexOf(position.symbol) < 0) {
            // Position not in short list either.  Clear position.
            if (position.side == "long") side = "sell";
            else side = "buy";
            const promCO = this.submitOrder(Math.abs(parseFloat(position.qty)), position.symbol, side);
            await promCO.then(() => { resolve(); });
          }
          else {
            // Position in short list.
            if (position.side == "long") {
              // Position changed from long to short.  Clear long position and short instead
              const promCS = this.submitOrder(parseFloat(position.qty), position.symbol, "sell");
              await promCS.then(() => { resolve(); });
            }
            else {
              if (Math.abs(parseFloat(position.qty)) == this.qShort) {
                // Position is where we want it.  Pass for now.
              }
              else {
                // Need to adjust position amount
                const diff = Number(Math.abs(parseFloat(position.qty))) - Number(this.qShort);
                if (diff > 0) {
                  // Too many short positions.  Buy some back to rebalance.
                  side = "buy";
                }
                else {
                  // Too little short positions.  Sell some more.
                  side = "sell";
                }
                const promRebalance = this.submitOrder(Math.abs(diff), position.symbol, side);
                await promRebalance;
              }
              executed.short.push(position.symbol);
              this.blacklist.add(position.symbol);
              resolve();
            }
          }
        }
        else {
          // Position in long list.
          if (position.side == "short") {
            // Position changed from short to long.  Clear short position and long instead.
            const promCS = this.submitOrder(Math.abs(parseFloat(position.qty)), position.symbol, "buy");
            await promCS.then(() => { resolve(); });
          }
          else {
            if (parseFloat(position.qty) == this.qLong) {
              // Position is where we want it.  Pass for now.
            }
            else {
              // Need to adjust position amount.
              const diff = Number(parseFloat(position.qty)) - Number(this.qLong);
              if (diff > 0) {
                // Too many long positions.  Sell some to rebalance.
                side = "sell";
              }
              else {
                // Too little long positions.  Buy some more.
                side = "buy";
              }
              const promRebalance = this.submitOrder(Math.abs(diff), position.symbol, side);
              await promRebalance;
            }
            executed.long.push(position.symbol);
            this.blacklist.add(position.symbol);
            resolve();
          }
        }
      }));
    });
    await Promise.all(promPositions);

    // Send orders to all remaining stocks in the long and short list.
    const promLong = this.sendBatchOrder(this.qLong as number, this.long, 'buy');
    const promShort = this.sendBatchOrder(this.qShort as number, this.short, 'sell');

    const promBatches: Promise<void>[] = [];
    this.adjustedQLong = -1;
    this.adjustedQShort = -1;

    await Promise.all([promLong, promShort]).then(async (resp: [string[], string[]][]) => {
      // Handle rejected/incomplete orders.
      resp.forEach(async (arrays: [string[], string[]], i: number) => {
        promBatches.push(new Promise<void>(async (resolve, reject) => {
          if (i == 0) {
            arrays[1] = arrays[1].concat(executed.long);
            executed.long = arrays[1].slice();
          }
          else {
            arrays[1] = arrays[1].concat(executed.short);
            executed.short = arrays[1].slice();
          }
          // Return orders that didn't complete, and determine new quantities to purchase.
          if (arrays[0].length > 0 && arrays[1].length > 0) {
            const promPrices = this.getTotalPrice(arrays[1]);

            await Promise.all(promPrices).then((resp: number[]) => {
              const completeTotal = resp.reduce((a, b) => a + b, 0);
              if (completeTotal != 0) {
                if (i == 0) {
                  this.adjustedQLong = Math.floor(this.longAmount / completeTotal);
                }
                else {
                  this.adjustedQShort = Math.floor(this.shortAmount / completeTotal);
                }
              }
            });
          }
          resolve();
        }));
      });
      await Promise.all(promBatches);
    }).then(async () => {
      // Reorder stocks that didn't throw an error so that the equity quota is reached.
      const promReorder = new Promise<void>(async (resolve, reject) => {
        const promLong: Promise<boolean>[] = [];
        if (this.adjustedQLong !== null && this.adjustedQLong >= 0) {
          this.qLong = this.adjustedQLong - (this.qLong as number);
          executed.long.forEach(async (stock: string) => {
            promLong.push(new Promise<boolean>(async (resolve, reject) => {
              const promLong = this.submitOrder(this.qLong as number, stock, 'buy');
              await promLong;
              resolve(true);
            }));
          });
        }

        const promShort: Promise<boolean>[] = [];
        if (this.adjustedQShort !== null && this.adjustedQShort >= 0) {
          this.qShort = this.adjustedQShort - (this.qShort as number);
          executed.short.forEach(async (stock: string) => {
            promShort.push(new Promise<boolean>(async (resolve, reject) => {
              const promShort = this.submitOrder(this.qShort as number, stock, 'sell');
              await promShort;
              resolve(true);
            }));
          });
        }
        const allProms = promLong.concat(promShort);
        if (allProms.length > 0) {
          await Promise.all(allProms);
        }
        resolve();
      });
      await promReorder;
    });
  }

  // Re-rank all stocks to adjust longs and shorts.
  async rerank(): Promise<void> {
    await this.rank();

    // Grabs the top and bottom quarter of the sorted stock list to get the long and short lists.
    const longShortAmount = Math.floor(this.allStocks.length / 4);
    this.long = [];
    this.short = [];
    for (let i = 0; i < this.allStocks.length; i++) {
      if (i < longShortAmount) this.short.push(this.allStocks[i].name);
      else if (i > (this.allStocks.length - 1 - longShortAmount)) this.long.push(this.allStocks[i].name);
      else continue;
    }

    // Determine amount to long/short based on total stock price of each bucket.
    let equity: string = "0";
    try {
      const resp: Account = await this.alpaca.getAccount();
      equity = resp.equity;
    } catch (err: any) { writeToEventLog(err); }
    this.shortAmount = 0.30 * parseFloat(equity);
    this.longAmount = Number(this.shortAmount) + Number(parseFloat(equity));

    let promLong: Promise<number>[] = [];
    try {
      promLong = this.getTotalPrice(this.long);
    } catch (err: any) { writeToEventLog(err); }

    let promShort: Promise<number>[] = [];
    try {
      promShort = this.getTotalPrice(this.short);
    } catch (err: any) { writeToEventLog(err); }

    let longTotal: number = 0;
    let shortTotal: number = 0;
    await Promise.all(promLong).then((resp: number[]) => {
      longTotal = resp.reduce((a, b) => a + b, 0);
    });
    await Promise.all(promShort).then((resp: number[]) => {
      shortTotal = resp.reduce((a, b) => a + b, 0);
    });

    this.qLong = Math.floor(this.longAmount / longTotal);
    this.qShort = Math.floor(this.shortAmount / shortTotal);
  }

  // Get the total price of the array of input stocks.
  getTotalPrice(stocks: string[]): Promise<number>[] {
    const proms: Promise<number>[] = [];
    stocks.forEach(async (stock: string) => {
      proms.push(new Promise<number>(async (resolve, reject) => {
        try {
          const resp = await this.alpaca.getBars('minute', stock, { limit: 1 });
          resolve(resp[stock][0].c);
        } catch (err: any) { writeToEventLog(err); reject(err); }
      }));
    });
    return proms;
  }

  // Submit an order if quantity is above 0.
  async submitOrder(quantity: number, stock: string, side: string): Promise<boolean> {
    const prom = new Promise<boolean>(async (resolve, reject) => {
      if (quantity > 0) {
        try {
          await this.alpaca.createOrder({
            symbol: stock,
            qty: quantity,
            side: side,
            type: 'market',
            time_in_force: 'day',
          });
          writeToEventLog("Market order of |" + quantity + " " + stock + " " + side + "| completed.");
          resolve(true);
        } catch (err: any) {
          writeToEventLog("Order of |" + quantity + " " + stock + " " + side + "| did not go through.");
          resolve(false);
        }
      }
      else {
        writeToEventLog("Quantity is <= 0, order of |" + quantity + " " + stock + " " + side + "| not sent.");
        resolve(true);
      }
    });
    return prom;
  }

  // Submit a batch order that returns completed and uncompleted orders.
  async sendBatchOrder(quantity: number, stocks: string[], side: string): Promise<[string[], string[]]> {
    const prom = new Promise<[string[], string[]]>(async (resolve, reject) => {
      const incomplete: string[] = [];
      const executed: string[] = [];
      const promOrders: Promise<void>[] = [];
      stocks.forEach(async (stock: string) => {
        promOrders.push(new Promise<void>(async (resolve, reject) => {
          if (!this.blacklist.has(stock)) {
            const promSO = this.submitOrder(quantity, stock, side);
            await promSO.then((resp: boolean) => {
              if (resp) executed.push(stock);
              else incomplete.push(stock);
              resolve();
            });
          }
          else resolve();
        }));
      });
      await Promise.all(promOrders).then(() => {
        resolve([incomplete, executed]);
      });
    });
    return prom;
  }

  // Get percent changes of the stock prices over the past 10 minutes.
  getPercentChanges(allStocks: Stock[]): Promise<void>[] {
    const length = 10;
    const promStocks: Promise<void>[] = [];
    allStocks.forEach((stock: Stock) => {
      promStocks.push(new Promise<void>(async (resolve, reject) => {
        try {
          const resp = await this.alpaca.getBars('minute', stock.name, { limit: length });
          stock.pc = (resp[stock.name][length - 1].c - resp[stock.name][0].o) / resp[stock.name][0].o;
        } catch (err: any) { writeToEventLog(err); }
        resolve();
      }));
    });
    return promStocks;
  }

  // Mechanism used to rank the stocks, the basis of the Long-Short Equity Strategy.
  async rank(): Promise<void> {
    // Ranks all stocks by percent change over the past 10 minutes (higher is better).
    const promStocks = this.getPercentChanges(this.allStocks);
    await Promise.all(promStocks);

    // Sort the stocks in place by the percent change field (marked by pc).
    this.allStocks.sort((a, b) => { return a.pc - b.pc; });
  }

  kill(): void {
    if (this.marketChecker) clearInterval(this.marketChecker);
    if (this.spin) clearInterval(this.spin);
    throw new Error("Killed script");
  }


  async init(): Promise<void> {
    const prom = this.getTodayOpenClose();
    await prom.then((resp: [Date, Date]) => {
      this.chart = new Chart(document.getElementById("main_chart") as HTMLCanvasElement, {
        type: 'line',
        data: {
          datasets: [{
            label: "equity",
            data: []
          }]
        },
        options: {
          scales: {
            xAxes: [{
              type: 'time',
              time: {
                unit: 'hour',
                min: resp[0],
                max: resp[1]
              },
            }],
            yAxes: [{

            }],
          },
          title: {
            display: true,
            text: "Equity"
          },
        }
      });
      this.updateChart();
    });
  }

  updateChart(): void {
    this.alpaca.getAccount().then((resp: Account) => {
      if (this.chart) {
        this.chart.data.datasets[0].data.push({
          t: new Date(),
          y: parseFloat(resp.equity)
        });
        this.chart.update();
      }
    });
    this.updateOrders();
    this.updatePositions();
  }

  getTodayOpenClose(): Promise<[Date, Date]> {
    return new Promise<[Date, Date]>(async (resolve, reject) => {
      try {
        const resp: Clock = await this.alpaca.getClock();
        const calendarResp = await this.alpaca.getCalendar({
          start: new Date(resp.timestamp),
          end: new Date(resp.timestamp)
        });
        const openTime = calendarResp[0].open;
        const closeTime = calendarResp[0].close;
        const calDate = calendarResp[0].date;

        const openTimeParts = openTime.split(":");
        const closeTimeParts = closeTime.split(":");
        const calDateParts = calDate.split("-");

        const offset = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours() - new Date().getHours();

        const openDate = new Date(parseInt(calDateParts[0]), parseInt(calDateParts[1]) - 1, parseInt(calDateParts[2]), parseInt(openTimeParts[0]) - offset, parseInt(openTimeParts[1]));
        const closeDate = new Date(parseInt(calDateParts[0]), parseInt(calDateParts[1]) - 1, parseInt(calDateParts[2]), parseInt(closeTimeParts[0]) - offset, parseInt(closeTimeParts[1]));
        resolve([openDate, closeDate]);
      } catch (err: any) {
        reject(err);
      }
    });
  }

  updatePositions(): void {
    $("#positions-log").empty();
    this.alpaca.getPositions().then((resp: Position[]) => {
      resp.forEach((position: Position) => {
        $("#positions-log").prepend(
          `<div class="position-inst">
            <p class="position-fragment">${position.symbol}</p>
            <p class="position-fragment">${position.qty}</p>
            <p class="position-fragment">${position.side}</p>
            <p class="position-fragment">${position.unrealized_pl}</p>
          </div>`
        );
      });
    });
  }

  updateOrders(): void {
    $("#orders-log").empty();
    this.alpaca.getOrders({
      status: "open"
    }).then((resp: Order[]) => {
      resp.forEach((order: Order) => {
        $("#orders-log").prepend(
          `<div class="order-inst">
            <p class="order-fragment">${order.symbol}</p>
            <p class="order-fragment">${order.qty}</p>
            <p class="order-fragment">${order.side}</p>
            <p class="order-fragment">${order.type}</p>
          </div>`
        );
      });
    });
  }
}

let ls: LongShort;

function runScript(): void {
  const API_KEY = $("#api-key").val() as string;
  const API_SECRET = $("#api-secret").val() as string;
  ls = new LongShort(API_KEY, API_SECRET);
  ls.init();
  ls.run();
}

function killScript(): void {
  $("#event-log").html("Killing script.");
  if (ls) {
    ls.kill();
  }
}

function writeToEventLog(text: string): void {
  $("#event-log").prepend(`<p class="event-fragment">${text}</p>`);
}
