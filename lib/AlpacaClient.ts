export interface AlpacaClient {
  sendRequest(endpoint: string, queryParams?: any, body?: any, method?: string): Promise<any>;
}
