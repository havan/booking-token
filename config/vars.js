const { vars } = require("hardhat/config");

const supplierKey = vars.has("SUPPLIER_PRIVATE_KEY")
  ? vars.get("SUPPLIER_PRIVATE_KEY")
  : null;
const buyerKey = vars.has("BUYER_PRIVATE_KEY")
  ? vars.get("BUYER_PRIVATE_KEY")
  : null;
const bookingTokenAddress = vars.has("BOOKING_TOKEN_ADDR")
  ? vars.get("BOOKING_TOKEN_ADDR")
  : null;

function getSupplierKey() {
  if (!supplierKey) {
    console.error(
      "SUPPLIER_PRIVATE_KEY is not set. Please set it using: hardhat vars set SUPPLIER_PRIVATE_KEY"
    );
  }
  return supplierKey;
}
function getBuyerKey() {
  if (!buyerKey) {
    console.error(
      "BUYER_PRIVATE_KEY is not set. Please set it using: hardhat vars set BUYER_PRIVATE_KEY"
    );
  }
  return buyerKey;
}
function getBookingTokenAddress() {
  if (!bookingTokenAddress) {
    console.error(
      "BOOKING_TOKEN_ADDR is not set. Please set it using: hardhat vars set BOOKING_TOKEN_ADDR"
    );
  }
  return bookingTokenAddress;
}
module.exports = {
  getSupplierKey,
  getBuyerKey,
  getBookingTokenAddress,
};
