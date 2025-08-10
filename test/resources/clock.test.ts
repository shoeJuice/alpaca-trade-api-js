import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import * as mock from "../support/mock-server";
import Alpaca from "../../lib/alpaca-trade-api";

chai.use(chaiAsPromised);

const alpaca = new Alpaca(mock.getConfig());

describe("clock resource", function () {
  describe("get", function () {
    it("returns valid results", function () {
      return expect(alpaca.getClock()).to.eventually.have.property("timestamp");
    });
  });
});