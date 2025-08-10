import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import * as mock from "../support/mock-server";
import Alpaca from "../../lib/alpaca-trade-api";

chai.use(chaiAsPromised);

describe("account resource", function () {
  it("returns 401 error if invalid API credentials are used", function () {
    const alpaca = new Alpaca(
      Object.assign(mock.getConfig(), { secretKey: "invalid_secret" })
    );
    return expect(alpaca.getAccount()).to.be.rejectedWith("401");
  });

  describe("get", function () {
    it("returns valid results", async function () {
      const alpaca = new Alpaca(mock.getConfig());
      const account = await alpaca.getAccount();
      expect(account).to.have.property("id");
    });
  });
});
