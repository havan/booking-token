require("@nomicfoundation/hardhat-toolbox");
const { vars } = require("hardhat/config");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    columbus: {
      url: vars.get("COLUMBUS_URL", "https://columbus.camino.network/ext/bc/C/rpc"),
      accounts: vars.has("COLUMBUS_DEPLOYER_PRIVATE_KEY") ? [vars.get("COLUMBUS_DEPLOYER_PRIVATE_KEY")] : [],
    },
  },
  etherscan: {
    apiKey: {
      columbus: "abc"
    },
    customChains: [
      {
        network: "columbus",
        chainId: 501,
        urls: {
          apiURL: "https://columbus.caminoscan.com/api",
          browserURL: "https://columbus.caminoscan.com"
        }
      }
    ]
  }
};
