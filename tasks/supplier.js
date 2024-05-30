require("@nomicfoundation/hardhat-toolbox");
const { getSupplierWallet, getBookingToken } = require("../utils/utils");

// Supplier task scope
const SUPPLIER_SCOPE = scope("supplier", "Register supplier and mint bookings");

// Register supplier task
SUPPLIER_SCOPE.task(
  "register",
  "Registers a supplier with the BookingToken contract",
)
  .addParam("name", "The name of the supplier. Eg: Chain4Travel")
  .setAction(async (taskArgs) => {
    const supplierWallet = await getSupplierWallet();
    const bookingToken = await getBookingToken();

    const tx = await bookingToken
      .connect(supplierWallet)
      .registerSupplier(taskArgs.name);

    const txReceipt = await tx.wait(1);

    console.log("Supplier registered.");
    console.log("Tx ID: ", txReceipt.hash);
    console.log(`Name: ${taskArgs.name}`);
  });

// Mint booking task
SUPPLIER_SCOPE.task("mint", "Mints a booking token")
  .addParam("reservedFor", "Address this token is reserved for buying")
  .addParam("uri", "URI of the token")
  .addParam("expiration", "Expiration timestamp")
  .setAction(async (taskArgs) => {
    const supplierWallet = await getSupplierWallet();
    const bookingToken = await getBookingToken();

    const tx = await bookingToken
      .connect(supplierWallet)
      .safeMint(taskArgs.reservedFor, taskArgs.uri, taskArgs.expiration);

    const txReceipt = await tx.wait(1);

    console.log("Booking token minted.");
    console.log("Tx ID: ", txReceipt.hash);

    for (const log of txReceipt.logs) {
      if (log.fragment.name === "TokenReservation") {
        console.log(`Reserved for: ${log.args[0]}`);
        console.log(`Token ID: ${log.args[1]}`);

        expiration = new Date(Number(log.args[2]) * 1000);
        console.log(`Expiration: ${expiration.toLocaleString()}`);
      }
    }
  });

module.exports = {};
