interface AlpacaCORSConfig {
  keyId: string;
  secretKey: string;
  baseUrl?: string;
}

class AlpacaCORS {
  keyId: string;
  secretKey: string;
  baseUrl: string;

  constructor(config: AlpacaCORSConfig) {
    this.keyId = config.keyId;
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl || "https://paper-api.alpaca.markets";
  }

  // Helper functions
  private async httpRequest(method: string, args: string, body: any = undefined): Promise<any> {
    const response = await fetch(`https://cors-anywhere.herokuapp.com/${this.baseUrl}/v2/${args}`, {
      method: method,
      mode: 'cors',
      headers: {
        "APCA-API-KEY-ID": this.keyId,
        "APCA-API-SECRET-KEY": this.secretKey,
        "Content-Type": body ? "application/json" : "",
      },
      body: body,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  private async dataHttpRequest(method: string, args: string, body: any = undefined): Promise<any> {
    const response = await fetch(`https://cors-anywhere.herokuapp.com/https://data.alpaca.markets/v1/${args}`, {
      method: method,
      mode: 'cors',
      headers: {
        "APCA-API-KEY-ID": this.keyId,
        "APCA-API-SECRET-KEY": this.secretKey,
        "Content-Type": body ? "application/json" : "",
      },
      body: body,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  private argsFormatter(type: string, path?: string[], query?: any): string {
    let str = type;
    if (path) {
      path.forEach((element) => {
        str += ("/" + element);
      });
    }
    if (query) {
      if (type) {
        str += "?";
      }
      str += Object.keys(query).map(element => encodeURIComponent(element) + "=" + encodeURIComponent(query[element])).join("&");
    }
    return str;
  }

  // Account methods
  async getAccount(): Promise<any> {
    return this.httpRequest("GET", this.argsFormatter("account", undefined, undefined));
  }

  // Order methods
  async createOrder(body: any): Promise<any> {
    return this.httpRequest("POST", this.argsFormatter("orders", undefined, undefined), JSON.stringify(body));
  }

  async getOrders(query: any = undefined): Promise<any> {
    return this.httpRequest("GET", this.argsFormatter("orders", undefined, query));
  }

  async getOrder(path: string): Promise<any> {
    return this.httpRequest("GET", this.argsFormatter("orders", [path], undefined));
  }

  async getOrderByClientId(query: any): Promise<any> {
    return this.httpRequest("GET", this.argsFormatter("orders:by_client_order_id", undefined, query));
  }

  async cancelOrder(path: string): Promise<any> {
    return this.httpRequest("DELETE", this.argsFormatter("orders", [path], undefined));
  }

  // Position methods
  async getPosition(path: string): Promise<any> {
    return this.httpRequest("GET", this.argsFormatter("positions", [path], undefined));
  }

  async getPositions(): Promise<any> {
    return this.httpRequest("GET", this.argsFormatter("positions", undefined, undefined));
  }

  // Asset methods
  async getAssets(query: any = undefined): Promise<any> {
    return this.httpRequest("GET", this.argsFormatter("assets", undefined, query));
  }

  async getAsset(path: string): Promise<any> {
    return this.httpRequest("GET", this.argsFormatter("assets", [path], undefined));
  }

  // Calendar methods
  async getCalendar(query: any = undefined): Promise<any> {
    return this.httpRequest("GET", this.argsFormatter("calendar", undefined, query));
  }

  // Clock methods
  async getClock(): Promise<any> {
    return this.httpRequest("GET", this.argsFormatter("clock", undefined, undefined));
  }

  // Bars methods
  async getBars(path: string, query1: string | string[], query2: any = undefined): Promise<any> {
    let query = typeof query1 === "string" ? query1 : query1.join(',');
    return this.dataHttpRequest("GET", this.argsFormatter("bars", [path], Object.assign({ symbols: query }, query2)));
  }
}

export default AlpacaCORS;
