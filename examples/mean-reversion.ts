import Alpaca from '../lib/alpaca-trade-api';

const API_KEY = 'YOUR_API_KEY_HERE';
const API_SECRET = 'YOUR_API_SECRET_HERE';
const PAPER = true;

interface Order {
  id: string;
  // Add other order properties as needed
}

interface Position {
  qty: string;
  market_value: string;
  // Add other position properties as needed
}

interface Clock {
  is_open: boolean;
  next_open: string;
  next_close: string;
  timestamp: string;
}

interface Bar {
  closePrice: number;
  // Add other bar properties as needed
}

class MeanReversion {
  alpaca: Alpaca;
  runningAverage: number;
  lastOrder: Order | null;
  timeToClose: number | null;
  stock: string;

  constructor(API_KEY: string, API_SECRET: string, PAPER: boolean){
    this.alpaca = new Alpaca({
      keyId: API_KEY,
      secretKey: API_SECRET,
      paper: PAPER
    });
    this.runningAverage = 0;
    this.lastOrder = null;
    this.timeToClose = null;
    // Stock that the algo will trade.
    this.stock = "AAPL";
  }

  async run(): Promise<void>{
    // First, cancel any existing orders so they don't impact our buying power.
    let orders: Order[] = [];
    try {
      orders = await this.alpaca.getOrders({
        status:'all',
        direction:'asc'
      });
    } catch (err: any) { console.log(err.error); }

    orders.forEach(async (order) => {
      try {
        await this.alpaca.cancelOrder(order.id);
      } catch (err: any) { console.log(err.error); }
    });

    // Wait for market to open.
    console.log("Waiting for market to open...");
    await this.awaitMarketOpen();
    console.log("Market opened.");

    // Get the running average of prices of the last 20 minutes, waiting until we have 20 bars from market open.
    const promBars = new Promise<void>((resolve, reject) => {
      const barChecker = setInterval(async () => {
        try {
          const resp = await this.alpaca.getCalendar(new Date());
          const marketOpen = resp[0].open;
          const barsResp = await this.alpaca.getBars('minute', this.stock, {start: marketOpen});
          const bars: Bar[] = barsResp[this.stock];
          if(bars.length >= 20) {
            clearInterval(barChecker);
            resolve();
          }
        } catch (err: any) { console.log(err.error); }
      }, 60000);
    });
    console.log("Waiting for 20 bars...");
    await promBars;
    console.log("We have 20 bars.");
    // Rebalance our portfolio every minute based off running average data.
    const spin = setInterval(async () => {

      // Clear the last order so that we only have 1 hanging order.
      if(this.lastOrder != null) {
        try {
          await this.alpaca.cancelOrder(this.lastOrder.id);
        } catch (err: any) { console.log(err.error); }
      }

      // Figure out when the market will close so we can prepare to sell beforehand.
      let closingTime: Date;
      let currTime: Date;
      try {
        const resp: Clock = await this.alpaca.getClock();
        closingTime = new Date(resp.next_close.substring(0, resp.next_close.length - 6));
        currTime = new Date(resp.timestamp.substring(0, resp.timestamp.length - 6));
      } catch (err: any) { console.log(err.error); return; }
      this.timeToClose = closingTime.getTime() - currTime.getTime();

      if(this.timeToClose < (60000 * 15)) {
        // Close all positions when 15 minutes til market close.
        console.log("Market closing soon.  Closing positions.");
        try{
          const resp: Position = await this.alpaca.getPosition(this.stock);
          const positionQuantity = parseFloat(resp.qty);
          await this.submitMarketOrder(positionQuantity, this.stock, "sell");
        } catch(err: any){/*console.log(err.error);*/}
        clearInterval(spin);
        console.log("Sleeping until market close (15 minutes).");
        setTimeout(() => {
          // Run script again after market close for next trading day.
          this.run();
        }, 60000*15);
      }
      else {
        // Rebalance the portfolio.
        await this.rebalance();
      }
    }, 60000);
  }

  // Spin until the market is open
  awaitMarketOpen(): Promise<void>{
    return new Promise((resolve, reject) => {
      const marketChecker = setInterval(async ()=>{
        try {
          const resp: Clock = await this.alpaca.getClock();
          const isOpen = resp.is_open;
          if(isOpen) {
            clearInterval(marketChecker);
            resolve();
          } else {
            let openTime: Date, currTime: Date;
            const clockResp: Clock = await this.alpaca.getClock();
            openTime = new Date(clockResp.next_open.substring(0, clockResp.next_close.length - 6));
            currTime = new Date(clockResp.timestamp.substring(0, clockResp.timestamp.length - 6));
            this.timeToClose = Math.floor((openTime.getTime() - currTime.getTime()) / 1000 / 60);
            console.log(this.timeToClose + " minutes til next market open.");
          }
        } catch (err: any) { console.log(err.error); }
      }, 60000);
    });
  }

  // Rebalance our position after an update.
  async rebalance(): Promise<void>{
    let positionQuantity = 0;
    let positionValue = 0;

    // Get our position, if any.
    try{
      const resp: Position = await this.alpaca.getPosition(this.stock);
      positionQuantity = parseFloat(resp.qty);
      positionValue = parseFloat(resp.market_value);
    } catch (err: any){/*console.log(err.error);*/}

    // Get the new updated price and running average.
    let bars: Bar[] = [];
    try {
      const barsResp = await this.alpaca.getBars('minute', this.stock,{limit: 20});
      bars = barsResp[this.stock];
    } catch (err: any) { console.log(err.error); return; }

    const currPrice = bars[bars.length - 1].closePrice;
    this.runningAverage = 0;
    bars.forEach((bar) => {
      this.runningAverage += bar.closePrice;
    });
    this.runningAverage /= 20;

    if(currPrice > this.runningAverage){
      // Sell our position if the price is above the running average, if any.
      if(positionQuantity > 0){
        console.log("Setting position to zero.");
        await this.submitLimitOrder(positionQuantity, this.stock, currPrice, 'sell');
      }
      else console.log("No position in the stock.  No action required.");
    }
    else if(currPrice < this.runningAverage){
      // Determine optimal amount of shares based on portfolio and market data.
      let portfolioValue: number = 0;
      let buyingPower: number = 0;
      try {
        const resp = await this.alpaca.getAccount();
        portfolioValue = parseFloat(resp.portfolio_value);
        buyingPower = parseFloat(resp.buying_power);
      } catch (err: any) { console.log(err.error); return; }

      const portfolioShare = (this.runningAverage - currPrice) / currPrice * 200;
      let targetPositionValue = portfolioValue * portfolioShare;
      let amountToAdd = targetPositionValue - positionValue;

      // Add to our position, constrained by our buying power; or, sell down to optimal amount of shares.
      if(amountToAdd > 0){
        if(amountToAdd > buyingPower) amountToAdd = buyingPower;
        const qtyToBuy = Math.floor(amountToAdd / currPrice);
        await this.submitLimitOrder(qtyToBuy, this.stock, currPrice, 'buy');
      }
      else{
        amountToAdd *= -1;
        let qtyToSell = Math.floor(amountToAdd / currPrice);
        if(qtyToSell > positionQuantity) qtyToSell = positionQuantity;
        await this.submitLimitOrder(qtyToSell, this.stock, currPrice, 'sell');
      }
    }
  }

  // Submit a limit order if quantity is above 0.
  async submitLimitOrder(quantity: number, stock: string, price: number, side: string): Promise<void>{
    if(quantity > 0){
      try {
        const resp: Order = await this.alpaca.createOrder({
          symbol: stock,
          qty: quantity,
          side: side,
          type: 'limit',
          time_in_force: 'day',
          limit_price: price
        });
        this.lastOrder = resp;
        console.log("Limit order of |" + quantity + " " + stock + " " + side + "| sent.");
      } catch (err: any) {
        console.log("Order of |" + quantity + " " + stock + " " + side + "| did not go through.");
      }
    }
    else {
      console.log("Quantity is <=0, order of |" + quantity + " " + stock + " " + side + "| not sent.");
    }
  }

  // Submit a market order if quantity is above 0.
  async submitMarketOrder(quantity: number, stock: string, side: string): Promise<void>{
    if(quantity > 0){
      try {
        const resp: Order = await this.alpaca.createOrder({
          symbol: stock,
          qty: quantity,
          side: side,
          type: 'market',
          time_in_force: 'day'
        });
        this.lastOrder = resp;
        console.log("Market order of |" + quantity + " " + stock + " " + side + "| completed.");
      } catch (err: any) {
        console.log("Order of |" + quantity + " " + stock + " " + side + "| did not go through.");
      }
    }
    else {
      console.log("Quantity is <=0, order of |" + quantity + " " + stock + " " + side + "| not sent.");
    }
  }
}

// Run the mean reversion class.
const MR = new MeanReversion(API_KEY, API_SECRET, PAPER);
MR.run();