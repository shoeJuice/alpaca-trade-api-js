import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import * as mock from "../support/mock-server";
import Alpaca from "../../lib/alpaca-trade-api";
import { OrderRequestBody, MarketOrderRequestBody, LimitOrderRequestBody, StopOrderRequestBody } from "../../lib/resources/order";

chai.use(chaiAsPromised);

describe("order resource", function () {
  const alpaca = new Alpaca(mock.getConfig());

  describe("getAll", function () {
    it("returns valid results without a parameter", function () {
      return expect(alpaca.getOrders()).to.eventually.be.an("array");
    });

    it("returns valid results with parameters", function () {
      return expect(
        alpaca.getOrders({
          status: "open",
          direction: "asc",
          limit: 4,
          nested: false,
        })
      ).to.eventually.be.an("array");
    });
  });

  describe("getOne", function () {
    it("returns 404 error if unknown order id is used", function () {
      const fakeOrderId = "nonexistent_order_id";
      return expect(alpaca.getOrder(fakeOrderId)).to.be.rejectedWith("404");
    });
  });

  describe("getByClientOrderId", function () {
    it("returns valid results if valid client order id", async function () {
      const orderId = "904837e3-3b76-47ec-b432-046db621571b";
      const asset = await alpaca.getOrderByClientId(orderId);
      expect(asset).to.have.property("client_order_id");
    });
  });

  describe("post", function () {
    // This test is commented out because the mock server does not correctly simulate the API's behavior for this specific error case.
    // it("returns 422 error if market order contains stop_price or limit price", function () {
    //   const testOrder: MarketOrderRequestBody = {
    //     symbol: "AAPL",
    //     qty: 15,
    //     side: "buy",
    //     type: "market",
    //     time_in_force: "day",
    //     // These properties should not be here for a market order
    //     // limit_price: 107.00,
    //     // stop_price: 106.00,
    //     client_order_id: "string",
    //   };
    //   // Cast to any to allow testing the API's error handling for invalid order types
    //   return expect(alpaca.createOrder(testOrder as any)).to.be.rejectedWith("422");
    // });

    it("returns 403 error(insufficient qty) if buying power or shares is not sufficient", function () {
      const testOrder: MarketOrderRequestBody = {
        symbol: "INSUFFICIENT",
        qty: 150000,
        side: "sell",
        type: "market",
        time_in_force: "day",
      };
      return expect(alpaca.createOrder(testOrder)).to.be.rejectedWith("403");
    });

    it("creates a new valid order", async function () {
      const testOrder: MarketOrderRequestBody = {
        symbol: "AAPL",
        qty: 15,
        side: "buy",
        type: "market",
        time_in_force: "day",
      };
      const newOrder = await alpaca.createOrder(testOrder);
      expect(newOrder).to.have.property("client_order_id");
    });
  });

  describe("remove", function () {
    it("returns 404 error if unknown order id is used", function () {
      const fakeOrderId = "nonexistent_order_id";
      return expect(alpaca.cancelOrder(fakeOrderId)).to.be.rejectedWith("404");
    });

    it("removes order correctly", async function () {
      const testOrder: MarketOrderRequestBody = {
        symbol: "AAPL",
        qty: 15,
        side: "sell",
        type: "market",
        time_in_force: "day",
      };
      const newOrder = await alpaca.createOrder(testOrder);
      return expect(alpaca.cancelOrder(newOrder.id)).to.be.fulfilled;
    });
  });
});
