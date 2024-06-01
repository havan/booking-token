# Booking Token

## Design

BookingToken is an ERC-721 NFT contract with additional functionalities.

> [!IMPORTANT]
> Please be aware that this smart contract code is not optimized for gas and, more importantly, it is not currently coded with security in mind. Do not use in production.

## Functions

Contract implements a few functions to be used for the Camino Messenger's booking process.

```solidity
registerSupplier(string supplierName)
```

This function registers the caller by giving them the `MINTER_ROLE`, enabling them to mint tokens. There is no authorization control for now; this is only for testing and development.

```solidity
safeMint(address reservedFor, string memory uri, uint256 expirationTimestamp)
```

This function is modified according to the use case. It takes an address, a URI, and an expiration timestamp (Unix). It mints a token, sets the owner as the caller (supplier), stores the given address in the `_reservedFor` mapping, sets the URI to `tokenURI`, and sets the `expirationTimestamp`. The timestamp must be at least 60 seconds in the future, checked against the block's timestamp.

```solidity
buy(uint256 tokenId)
```

This function should be called by the buyer, who has the address that the token is reserved for. When called, the token is transferred from the supplier to the buyer's address, and the reservation and expiration are deleted.

```solidity
getSupplierName(address supplier)
```

Returns the supplier name for the given `address`. This can be used to check if an address is a supplier (i.e., if it called `registerSupplier`).

```solidity
getTokenSupplier(uint256 tokenId)
```

Returns the supplier's address that created the provided `tokenId`.

## Interacting with the Contract

The contract is deployed to the Columbus testnet. The contract address is below:

```
0xd4e2D76E656b5060F6f43317E8d89ea81eb5fF8D
```

On CaminoScan: https://columbus.caminoscan.com/address/0xd4e2D76E656b5060F6f43317E8d89ea81eb5fF8D

### Using hardhat

There are two tasks created for Hardhat, `supplier` and `buyer`. To use them, you should set some vars with Hardhat. You can check which variables need to be set using the `yarn hardhat vars setup` command.

For interacting with the contract, only the following variables are necessary: `SUPPLIER_PRIVATE_KEY`, `BUYER_PRIVATE_KEY`, `BOOKING_TOKEN_ADDR`.

```
$ yarn hardhat vars setup
yarn run v1.22.19
$ /hgst/work/github.com/havan/booking-token/node_modules/.bin/hardhat vars setup
The following configuration variables are optional:

  npx hardhat vars set COLUMBUS_DEPLOYER_PRIVATE_KEY
  npx hardhat vars set COLUMBUS_URL

Configuration variables already set:

  Optional:
    SUPPLIER_PRIVATE_KEY
    BUYER_PRIVATE_KEY
    BOOKING_TOKEN_ADDR

Done in 0.46s.
```

You can also use `--help` to get information about the tasks:

```
$ yarn supplier mint --help
yarn run v1.22.19
$ yarn hardhat supplier mint --help
$ /hgst/work/github.com/havan/booking-token/node_modules/.bin/hardhat supplier mint --help
Hardhat version 2.22.4

Usage: hardhat [GLOBAL OPTIONS] supplier mint --expiration <STRING> --reserved-for <STRING> --uri <STRING>

OPTIONS:

  --expiration          Expiration timestamp
  --reserved-for        Address this token is reserved for buying
  --uri                 URI of the token

mint: Mints a booking token

For global options help run: hardhat help

Done in 0.79s.
```

```
yarn buyer buy --help
yarn run v1.22.19
$ yarn hardhat buyer buy --help
$ /hgst/work/github.com/havan/booking-token/node_modules/.bin/hardhat buyer buy --help
Hardhat version 2.22.4

Usage: hardhat [GLOBAL OPTIONS] buyer buy --token-id <STRING>

OPTIONS:

  --token-id    Token ID to buy

buy: Buys a reserved booking token

For global options help run: hardhat help

Done in 0.76s.
```

#### Register a Supplier

This registers a supplier with the contract using the given supplier name. This is required before minting a token.

```
yarn supplier register --name "<Supplier Name>" --network columbus
```

#### Mint a BookingToken

```
yarn supplier mint --reserved-for <reserved-for-address>
    --uri <token-uri> --expiration <timestamp> --network <network>
```

**Example:**

```
yarn supplier mint --reserved-for 0x70b150b486f207fb7aa4ad958124c58b66a47664 \
    --uri 'data:application/json;base64,eyJuYW1lIjoiQ2FtaW5vIE1lc3NlbmdlciBCb29raW5nVG9rZW4gVGVzdCJ9Cg=='
    --expiration `date -d "60 minutes" +%s`
    --network columbus
```

> [!NOTE]
> The URI used in this example is a base64 encoded JSON that includes only a name for the token. You can also create your own with the command below, or you can host your JSON on IPFS and use the URL instead.
>
> ```
> echo '{"name":"Camino Messenger BookingToken Test"}'| base64 -w 0
> ```

#### Buy a reserved token

This task transfers the reserved token from the supplier to the buyer.

```
yarn buyer buy --token-id <token-id> --network columbus
```

## Go Example

The repository also contains an example Go application to interact with the BookingToken contract. It has similar commands.

```
$ go run bookctl.go --help
```

or if you have built it:

```
$ ./bookctl --help
```

```
Interact with the booking token smart contract

Usage:
  bookctl [command]

Available Commands:
  buy         Buy a token reserved for your address using <buyer_private_key> in the config.
  completion  Generate the autocompletion script for the specified shell
  help        Help about any command
  mint        Mint a new token.
  register    Register a new supplier using the <supplier_private_key> in the config.

Flags:
      --config string   config file (default is ./config.yaml)
  -h, --help            help for bookctl

Use "bookctl [command] --help" for more information about a command.
```

Required variables are set using a config file. In the folder, there is an `example-config.yaml` file. Copy this file as `config.yaml` and fill in the details. The application will try to read the config file from the current directory, or you can also set the config file path using the `--config` flag.

**Example Command:**

```
go run bookctl.go mint 0x70b150b486f207fb7aa4ad958124c58b66a47664 \
    'data:application/json;base64,eyJuYW1lIjoiQ2FtaW5vIE1lc3NlbmdlciBCb29raW5nVG9rZW4gVGVzdCJ9Cg==' \
    --config ~/.config/bookctl.yaml
```

**Example Config File:**

```yaml
# Example config file. Rename it to "config.yaml" and fill in the details.
# Provided values are defaults.
rpc_url: "https://columbus.camino.network/ext/bc/C/rpc"
booking_token_addr: "0xd4e2D76E656b5060F6f43317E8d89ea81eb5fF8D"
supplier_private_key: "<SUPPLIER PRIVATE KEY>"
buyer_private_key: "<BUYER PRIVATE KEY>"
abi_file: "abi/BookingTokenV0.abi"
```

### TODO

- Refactor to use upgradeable contracts
