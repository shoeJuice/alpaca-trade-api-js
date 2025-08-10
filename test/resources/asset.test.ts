import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import * as mock from "../support/mock-server";
import Alpaca from "../../lib/alpaca-trade-api";

chai.use(chaiAsPromised);

const alpaca = new Alpaca(mock.getConfig());

describe("asset resource", function () {
  describe("getAll", function () {
    it("returns valid results without parameters", function () {
      return expect(alpaca.getAssets()).to.eventually.be.an("array");
    });

    it("returns valid results with a status parameter", function () {
      return expect(alpaca.getAssets({ status: "active" }))
        .to.eventually.be.an("array");
    });

    it("returns valid results with an asset_class parameter", function () {
      return expect(alpaca.getAssets({ asset_class: "us_equity" }))
        .to.eventually.be.an("array");
    });

    it("returns valid results with both parameters", function () {
      return expect(alpaca.getAssets({ status: "inactive", asset_class: "us_equity" }))
        .to.eventually.be.an("array");
    });
  });

  describe("getOne", function () {
    it("returns 404 error if unknown symbol is used", function () {
      return expect(alpaca.getAsset("FAKE")).to.be.rejectedWith("404");
    });

    it("returns valid results if valid symbol is used otherwise, 404", async function () {
      const symbol = "7b8bfbfb-dea5-4de5-a557-40dc30532955";
      try {
        const asset = await alpaca.getAsset(symbol);
        expect(asset).to.have.property("asset_class");
      } catch (error: any) {
        expect(error.statusCode).to.equal(404);
      }
    });
  });
});