import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";
import joinUrl from "urljoin";

interface Configuration {
  baseUrl: string;
  keyId: string;
  secretKey: string;
  apiVersion: string;
  oauth: string;
  dataBaseUrl: string;
}

export function httpRequest(this: { configuration: Configuration }, endpoint: string, queryParams?: any, body?: any, method?: string): Promise<AxiosResponse> {
  const { baseUrl, keyId, secretKey, apiVersion, oauth } = this.configuration;
  const req: AxiosRequestConfig = {
    method: method as Method || "GET",
    url: joinUrl(baseUrl, apiVersion, endpoint),
    params: queryParams || {},
    headers:
      oauth !== ""
        ? {
            "content-type": method !== "DELETE" ? "application/json" : "",
            Authorization: "Bearer " + oauth,
          }
        : {
            "content-type": method !== "DELETE" ? "application/json" : "",
            "APCA-API-KEY-ID": keyId,
            "APCA-API-SECRET-KEY": secretKey,
          },
    data: body || undefined,
  };
  return axios(req);
}

export function dataHttpRequest(this: { configuration: Configuration }, endpoint: string, queryParams?: any, body?: any, method?: string): Promise<AxiosResponse> {
  const { dataBaseUrl, keyId, secretKey, oauth } = this.configuration;
  const req: AxiosRequestConfig = {
    method: method as Method || "GET",
    url: joinUrl(dataBaseUrl, "v2", endpoint), // Data API in docs is set to v2, upgrade
    params: queryParams || {},
    headers:
      oauth !== ""
        ? {
            "content-type": method !== "DELETE" ? "application/json" : "",
            Authorization: "Bearer " + oauth,
          }
        : {
            "content-type": method !== "DELETE" ? "application/json" : "",
            "APCA-API-KEY-ID": keyId,
            "APCA-API-SECRET-KEY": secretKey,
          },
    data: body || undefined,
  };

  return axios(req);
}

export function sendRequest(f: (endpoint: string, queryParams?: any, body?: any, method?: string) => Promise<AxiosResponse>, endpoint: string, queryParams?: any, body?: any, method?: string): Promise<any> {
  return f(endpoint, queryParams, body, method).then((resp) => resp.data);
}
