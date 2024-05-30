package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// Loads an ABI file
func loadABI(filePath string) (abi.ABI, error) {
	file, err := os.ReadFile(filePath)
	if err != nil {
		return abi.ABI{}, err
	}
	return abi.JSON(strings.NewReader(string(file)))
}

// Loads a private key
func loadPrivateKey(hexKey string) (*ecdsa.PrivateKey, error) {
	return crypto.HexToECDSA(hexKey)
}

// Gets the RPC client
func getClient() (*ethclient.Client, error) {
	return ethclient.Dial(viper.GetString("rpc_url"))
}

// Waits for a transaction to be mined
func waitTransaction(ctx context.Context, b bind.DeployBackend, tx *types.Transaction) (receipt *types.Receipt, err error) {

	fmt.Printf("Waiting for transaction to be mined...\n")

	receipt, err = bind.WaitMined(ctx, b, tx)

	if err != nil {
		return receipt, err
	}

	if receipt.Status != types.ReceiptStatusSuccessful {
		return receipt, fmt.Errorf("transaction failed: %v", receipt)
	}

	fmt.Printf("Successfully mined. Block Nr: %s Gas used: %d\n", receipt.BlockNumber, receipt.GasUsed)

	return receipt, nil
}

// Registers a new supplier with the BookingToken contract
func register(client *ethclient.Client, contractABI abi.ABI, privateKey *ecdsa.PrivateKey, supplierName string) error {
	address := crypto.PubkeyToAddress(privateKey.PublicKey)
	nonce, err := client.PendingNonceAt(context.Background(), address)
	if err != nil {
		return err
	}

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		return err
	}

	packed, err := contractABI.Pack("registerSupplier", supplierName)
	if err != nil {
		return err
	}

	gasLimit := uint64(70000)

	tx := types.NewTransaction(nonce, common.HexToAddress(viper.GetString("booking_token_addr")), big.NewInt(0), gasLimit, gasPrice, packed)

	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		return err
	}

	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		return err
	}

	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return err
	}

	fmt.Printf("Transaction sent!\nTransaction hash: %s\n", signedTx.Hash().Hex())

	// Wait for transaction to be mined
	receipt, err := waitTransaction(context.Background(), client, signedTx)
	if err != nil {
		if gasLimit == receipt.GasUsed {
			fmt.Printf("Transaction Gas Limit reached. Please use shorter supplier name.\n")
		}
		return err
	}

	return nil
}

// Mints a BookingToken with the supplier private key and reserves it for the buyer address
// For testing you can use this uri: "data:application/json;base64,eyJuYW1lIjoiQ2FtaW5vIE1lc3NlbmdlciBCb29raW5nVG9rZW4gVGVzdCJ9Cg=="
func mint(client *ethclient.Client, contractABI abi.ABI, privateKey *ecdsa.PrivateKey, reservedFor common.Address, uri string, expiration *big.Int) error {
	address := crypto.PubkeyToAddress(privateKey.PublicKey)
	nonce, err := client.PendingNonceAt(context.Background(), address)
	if err != nil {
		return err
	}

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		return err
	}

	packed, err := contractABI.Pack("safeMint", reservedFor, uri, expiration)
	if err != nil {
		return err
	}

	gasLimit := uint64(600000)

	tx := types.NewTransaction(nonce, common.HexToAddress(viper.GetString("booking_token_addr")), big.NewInt(0), gasLimit, gasPrice, packed)

	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		return err
	}

	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		return err
	}

	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return err
	}

	fmt.Printf("Transaction sent!\nTransaction hash: %s\n", signedTx.Hash().Hex())

	// Wait for transaction to be mined
	receipt, err := waitTransaction(context.Background(), client, signedTx)
	if err != nil {
		if gasLimit == receipt.GasUsed {
			fmt.Printf("Transaction Gas Limit reached. Please check your inputs.\n")
		}
		return err
	}

	// Define the TokenReservation structure
	type TokenReservation struct {
		ReservedFor         common.Address
		TokenID             *big.Int
		ExpirationTimestamp *big.Int
	}

	// Get the event signature hash
	event := contractABI.Events["TokenReservation"]
	eventSignature := event.ID.Hex()

	// Iterate over the logs to find the event
	for _, vLog := range receipt.Logs {
		if vLog.Topics[0].Hex() == eventSignature {
			// Decode indexed parameters
			reservedFor := common.HexToAddress(vLog.Topics[1].Hex())
			tokenId := new(big.Int).SetBytes(vLog.Topics[2].Bytes())

			// Decode non-indexed parameters
			var reservation TokenReservation
			err := contractABI.UnpackIntoInterface(&reservation, "TokenReservation", vLog.Data)
			if err != nil {
				return err
			}
			reservation.ReservedFor = reservedFor
			reservation.TokenID = tokenId

			// Print the reservation details
			fmt.Printf("Reservation Details:\n")
			fmt.Printf("Token ID    : %s\n", reservation.TokenID.String())
			fmt.Printf("Reserved For: %s\n", reservation.ReservedFor.Hex())
			fmt.Printf("Expiration  : %s\n", reservation.ExpirationTimestamp.String())
		}
	}

	return nil
}

// Buys a token with the buyer private key. Token must be reserved for the buyer address.
func buy(client *ethclient.Client, contractABI abi.ABI, privateKey *ecdsa.PrivateKey, tokenId *big.Int) error {
	address := crypto.PubkeyToAddress(privateKey.PublicKey)
	nonce, err := client.PendingNonceAt(context.Background(), address)
	if err != nil {
		return err
	}

	gasPrice, err := client.SuggestGasPrice(context.Background())
	if err != nil {
		return err
	}

	packed, err := contractABI.Pack("buy", tokenId)
	if err != nil {
		return err
	}

	gasLimit := uint64(80000)

	tx := types.NewTransaction(nonce, common.HexToAddress(viper.GetString("booking_token_addr")), big.NewInt(0), gasLimit, gasPrice, packed)

	chainID, err := client.NetworkID(context.Background())
	if err != nil {
		return err
	}

	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(chainID), privateKey)
	if err != nil {
		return err
	}

	err = client.SendTransaction(context.Background(), signedTx)
	if err != nil {
		return err
	}

	fmt.Printf("Transaction sent!\nTransaction hash: %s\n", signedTx.Hash().Hex())

	// Wait for transaction to be mined
	receipt, err := waitTransaction(context.Background(), client, signedTx)
	if err != nil {
		if gasLimit == receipt.GasUsed {
			fmt.Printf("Transaction Gas Limit reached. Please check your inputs.\n")
		}
		return err
	}

	return nil
}

func main() {
	var cfgFile string

	var rootCmd = &cobra.Command{
		Use:   "bookctl",
		Short: "Interact with the booking token smart contract",
		PersistentPreRun: func(cmd *cobra.Command, args []string) {
			if cfgFile != "" {
				viper.SetConfigFile(cfgFile)
			} else {
				pwd, err := os.Getwd()
				if err != nil {
					log.Fatalf("Failed to get current working directory: %v", err)
				}
				viper.AddConfigPath(pwd)
				viper.SetConfigFile("config.yaml")
			}

			if err := viper.ReadInConfig(); err != nil {
				log.Fatalf("Error reading config file: %v", err)
			} else {
				fmt.Printf("Using config file: %s\n", viper.ConfigFileUsed())
			}

			viper.SetEnvPrefix("bookctl")
			viper.AutomaticEnv()

			viper.SetDefault("rpc_url", "https://columbus.camino.network/ext/bc/C/rpc")
			viper.SetDefault("booking_token_addr", "0xd4e2D76E656b5060F6f43317E8d89ea81eb5fF8D")
			viper.SetDefault("abi_file", "abi/BookingTokenV0.abi")
		},
	}

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is ./config.yaml)")

	var registerCmd = &cobra.Command{
		Use:   "register [supplier-name]",
		Short: "Register a new supplier using the <supplier_private_key> in the config.",
		Long:  "Register a new supplier with the BookingToken contract.\n\nThis calls the registerSupplier method on the contract with the name\nprovided using the supplied buyer private key in the config.",
		Args:  cobra.MinimumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			client, err := getClient()
			if err != nil {
				log.Fatalf("Failed to connect to the Ethereum client: %v", err)
			}

			contractABI, err := loadABI(viper.GetString("abi_file"))
			if err != nil {
				log.Fatalf("Failed to load contract ABI: %v", err)
			}

			supplierPrivateKey, err := loadPrivateKey(viper.GetString("supplier_private_key"))
			if err != nil {
				log.Fatalf("Failed to load supplier private key: %v", err)
			}

			err = register(client, contractABI, supplierPrivateKey, args[0])
			if err != nil {
				log.Fatalf("Failed to register supplier: %v", err)
			}
		},
	}

	var mintCmd = &cobra.Command{
		Use:   "mint [reserved-for] [token-uri] [expiration-timestamp]",
		Short: "Mint a new token.",
		Long:  "Mint BookingToken\n\nIf you omit the expiration timestamp it will be set to +10 mins from the current time.",
		Args:  cobra.MinimumNArgs(2),
		Run: func(cmd *cobra.Command, args []string) {
			client, err := getClient()
			if err != nil {
				log.Fatalf("Failed to connect to the Ethereum client: %v", err)
			}

			contractABI, err := loadABI(viper.GetString("abi_file"))
			if err != nil {
				log.Fatalf("Failed to load contract ABI: %v", err)
			}

			supplierPrivateKey, err := loadPrivateKey(viper.GetString("supplier_private_key"))
			if err != nil {
				log.Fatalf("Failed to load supplier private key: %v", err)
			}

			reservedFor := common.HexToAddress(args[0])
			uri := args[1]

			var expiration *big.Int
			if len(args) > 2 {
				expiration = new(big.Int)
				if _, success := expiration.SetString(args[2], 10); !success {
					log.Fatalf("Invalid expiration time: %v", args[2])
				}
			} else {
				expiration = big.NewInt(time.Now().Unix() + 600)
			}

			err = mint(client, contractABI, supplierPrivateKey, reservedFor, uri, expiration)
			if err != nil {
				log.Fatalf("Failed to mint token: %v", err)
			}
		},
	}

	var buyCmd = &cobra.Command{
		Use:   "buy [tokenId]",
		Short: "Buy a token reserved for your address using <buyer_private_key> in the config.",
		Long:  "Buys a reserved token.\n\nYou should specify the token ID that is created by the supplier.",
		Args:  cobra.MinimumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			client, err := getClient()
			if err != nil {
				log.Fatalf("Failed to connect to the Ethereum client: %v", err)
			}

			contractABI, err := loadABI(viper.GetString("abi_file"))
			if err != nil {
				log.Fatalf("Failed to load contract ABI: %v", err)
			}

			buyerPrivateKey, err := loadPrivateKey(viper.GetString("buyer_private_key"))
			if err != nil {
				log.Fatalf("Failed to load buyer private key: %v", err)
			}

			tokenId := new(big.Int)
			tokenId.SetString(args[0], 10)

			err = buy(client, contractABI, buyerPrivateKey, tokenId)
			if err != nil {
				log.Fatalf("Failed to buy token: %v", err)
			}
		},
	}

	rootCmd.AddCommand(registerCmd)
	rootCmd.AddCommand(mintCmd)
	rootCmd.AddCommand(buyCmd)
	rootCmd.Execute()
}
