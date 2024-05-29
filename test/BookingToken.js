const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

describe("BookingToken", function () {
  async function deployBookingTokenFixture() {
    // Contracts are deployed using the first signer/account by default
    const [deployer, supplier, reservedFor, otherAccount] =
      await ethers.getSigners();

    defaultAdmin = deployer;
    minter = deployer;

    const BookingToken = await ethers.getContractFactory("BookingTokenV0");
    const bookingToken = await BookingToken.deploy(
      "BookingToken",
      "BOOKINGTOKEN"
    );

    return {
      bookingToken,
      defaultAdmin,
      minter,
      supplier,
      reservedFor,
      otherAccount,
    };
  }

  describe("Deployment", function () {
    it("Should set the right admin and minter roles", async function () {
      const { bookingToken, defaultAdmin, minter } = await loadFixture(
        deployBookingTokenFixture
      );

      expect(
        await bookingToken.hasRole(
          await bookingToken.DEFAULT_ADMIN_ROLE(),
          defaultAdmin.address
        )
      ).to.equal(true);
      expect(
        await bookingToken.hasRole(
          await bookingToken.MINTER_ROLE(),
          minter.address
        )
      ).to.equal(true);
    });
  });

  describe("Register Supplier", function () {
    it("Should register a supplier", async function () {
      const { bookingToken, supplier } = await loadFixture(
        deployBookingTokenFixture
      );

      await bookingToken.connect(supplier).registerSupplier("SupplierName");

      expect(await bookingToken.getSupplierName(supplier.address)).to.equal(
        "SupplierName"
      );
    });

    it("Should emit SupplierRegistered event", async function () {
      const { bookingToken, supplier } = await loadFixture(
        deployBookingTokenFixture
      );

      await expect(
        bookingToken.connect(supplier).registerSupplier("SupplierName")
      )
        .to.emit(bookingToken, "SupplierRegistered")
        .withArgs(supplier.address, "SupplierName");
    });
  });

  describe("Safe Mint", function () {
    it("Should mint a new token", async function () {
      const { bookingToken, minter, reservedFor } = await loadFixture(
        deployBookingTokenFixture
      );

      const tokenId = 0;
      const uri = "tokenURI";
      const expirationTimestamp = (await time.latest()) + 100;

      await bookingToken
        .connect(minter)
        .safeMint(reservedFor.address, uri, expirationTimestamp);

      expect(await bookingToken.ownerOf(tokenId)).to.equal(minter.address);
      expect(await bookingToken.tokenURI(tokenId)).to.equal(uri);
      expect(await bookingToken.getTokenSupplier(tokenId)).to.equal(
        minter.address
      );
    });

    it("Should revert if expiration timestamp is less than 60 seconds from now", async function () {
      const { bookingToken, minter, reservedFor } = await loadFixture(
        deployBookingTokenFixture
      );

      const uri = "tokenURI";
      const expirationTimestamp = (await time.latest()) + 59; // less than 60 seconds

      await expect(
        bookingToken
          .connect(minter)
          .safeMint(reservedFor.address, uri, expirationTimestamp)
      ).to.be.revertedWith(
        "BookingToken: Expiration timestamp must be at least 60 seconds in the future"
      );
    });

    it("Should emit TokenReservation event", async function () {
      const { bookingToken, minter, reservedFor } = await loadFixture(
        deployBookingTokenFixture
      );

      const tokenId = 0;
      const uri = "tokenURI";
      const expirationTimestamp = (await time.latest()) + 100;

      await expect(
        bookingToken
          .connect(minter)
          .safeMint(reservedFor.address, uri, expirationTimestamp)
      )
        .to.emit(bookingToken, "TokenReservation")
        .withArgs(reservedFor.address, tokenId, expirationTimestamp);
    });
  });

  describe("Buy Token", function () {
    it("Should allow reserved address to buy token", async function () {
      const { bookingToken, minter, reservedFor } = await loadFixture(
        deployBookingTokenFixture
      );

      const tokenId = 0;
      const uri = "tokenURI";
      const expirationTimestamp = (await time.latest()) + 100;

      await bookingToken
        .connect(minter)
        .safeMint(reservedFor.address, uri, expirationTimestamp);
      await bookingToken.connect(reservedFor).buy(tokenId);

      expect(await bookingToken.ownerOf(tokenId)).to.equal(reservedFor.address);
    });

    it("Should revert if not reserved address tries to buy token", async function () {
      const { bookingToken, minter, reservedFor, otherAccount } =
        await loadFixture(deployBookingTokenFixture);

      const tokenId = 0;
      const uri = "tokenURI";
      const expirationTimestamp = (await time.latest()) + 100;

      await bookingToken
        .connect(minter)
        .safeMint(reservedFor.address, uri, expirationTimestamp);

      await expect(
        bookingToken.connect(otherAccount).buy(tokenId)
      ).to.be.revertedWith(
        "BookingToken: You do not have a reservation for this token"
      );
    });

    it("Should revert if token reservation has expired", async function () {
      const { bookingToken, minter, reservedFor } = await loadFixture(
        deployBookingTokenFixture
      );

      const tokenId = 0;
      const uri = "tokenURI";
      const expirationTimestamp = (await time.latest()) + 100;

      await bookingToken
        .connect(minter)
        .safeMint(reservedFor.address, uri, expirationTimestamp);

      await time.increaseTo(expirationTimestamp + 1); // Move time past expiration

      await expect(
        bookingToken.connect(reservedFor).buy(tokenId)
      ).to.be.revertedWith("BookingToken: Token reservation has expired");
    });

    it("Should emit TokenBought event", async function () {
      const { bookingToken, minter, reservedFor } = await loadFixture(
        deployBookingTokenFixture
      );

      const tokenId = 0;
      const uri = "tokenURI";
      const expirationTimestamp = (await time.latest()) + 100;

      await bookingToken
        .connect(minter)
        .safeMint(reservedFor.address, uri, expirationTimestamp);
      await time.increaseTo(expirationTimestamp - 10); // Ensure it's not expired

      await expect(bookingToken.connect(reservedFor).buy(tokenId))
        .to.emit(bookingToken, "TokenBought")
        .withArgs(tokenId, reservedFor.address);
    });
  });

  describe("Full Flow", function () {
    it("Should register a supplier, mint a token, and allow buyer to purchase", async function () {
      const { bookingToken, supplier, reservedFor } = await loadFixture(
        deployBookingTokenFixture
      );

      // Register supplier
      await bookingToken.connect(supplier).registerSupplier("SupplierName");

      // Mint token
      const tokenId = 0;
      const uri = "tokenURI";
      const expirationTimestamp = (await time.latest()) + 100;

      await bookingToken
        .connect(supplier)
        .safeMint(reservedFor.address, uri, expirationTimestamp);

      // Buyer buys the token
      await time.increaseTo(expirationTimestamp - 10); // Ensure it's not expired
      await bookingToken.connect(reservedFor).buy(tokenId);

      // Check if the owner is the buyer and the supplier is correct
      expect(await bookingToken.ownerOf(tokenId)).to.equal(reservedFor.address);
      expect(await bookingToken.getTokenSupplier(tokenId)).to.equal(
        supplier.address
      );
    });
  });
});
