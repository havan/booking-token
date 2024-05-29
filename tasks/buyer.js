require("@nomicfoundation/hardhat-toolbox");
const { getBuyerWallet, getBookingToken } = require("../utils/utils");

// Buyer task scope
const BUYER_SCOPE = scope("buyer", "Buy reserved bookings");

// Buy booking token task
BUYER_SCOPE.task("buy", "Buys a reserved booking token")
  .addParam("tokenId", "Token ID to buy")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;

    const buyerWallet = await getBuyerWallet();
    const bookingToken = await getBookingToken();

    const tx = await bookingToken.connect(buyerWallet).buy(taskArgs.tokenId);
    const txReceipt = await tx.wait(1);
    console.log("Booking token bought.");
    console.log("Tx ID: ", txReceipt.hash);
  });

module.exports = {};
