const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { vars } = require("hardhat/config");

module.exports = buildModule("BookingTokenModule", (m) => {
  const name = m.getParameter("name", "BookingTokenV0");
  const symbol = m.getParameter("symbol", "BOOKING.v0");

  const bookingToken = m.contract("BookingTokenV0", [name, symbol]);

  return { bookingToken };
});
