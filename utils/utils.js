const { vars } = require("hardhat/config");
const {
  getSupplierKey,
  getBuyerKey,
  getBookingTokenAddress,
} = require("../config/vars");

// TODO: Get contract name from config
async function getBookingToken() {
  const BookingToken = await hre.ethers.getContractFactory("BookingTokenV0");
  return BookingToken.attach(getBookingTokenAddress());
}

async function getSupplierWallet() {
  const supplierKey = getSupplierKey();

  if (!supplierKey) {
    throw Error("No SUPPLIER_PRIVATE_KEY set.");
  }

  const supplierWallet = new hre.ethers.Wallet(
    supplierKey,
    hre.ethers.provider,
  );

  return supplierWallet;
}

async function getBuyerWallet() {
  const buyerKey = getBuyerKey();

  if (!buyerKey) {
    throw Error("No BUYER_PRIVATE_KEY set.");
  }

  const buyerWallet = new hre.ethers.Wallet(buyerKey, hre.ethers.provider);

  return buyerWallet;
}

module.exports = {
  getBookingToken,
  getSupplierWallet,
  getBuyerWallet,
};
