// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/* 
 ░▒▓██████▓▒░ ░▒▓██████▓▒░░▒▓██████████████▓▒░░▒▓█▓▒░▒▓███████▓▒░ ░▒▓██████▓▒░                      
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░                     
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░                     
░▒▓█▓▒░      ░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░                     
░▒▓█▓▒░      ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░                     
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░                     
 ░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░                      
                                                                                                    
                                                                                                    
░▒▓███████▓▒░░▒▓████████▓▒░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓███████▓▒░░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░▒▓██████▓▒░    ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░░▒▓███████▓▒░  
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░▒▓████████▓▒░  ░▒▓█▓▒░    ░▒▓█████████████▓▒░ ░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ 
*/

contract BookingTokenV0 is ERC721, ERC721URIStorage, AccessControl {
    // Define a role identifier for the minter role
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Counter for generating unique token IDs
    uint256 private _nextTokenId;

    // Mapping to store supplier names
    mapping(address => string) private _supplierNames;

    // Mapping to store reserved addresses for specific tokens
    mapping(uint256 => address) private _reservedFor;

    // Mapping to store suppliers of tokens
    mapping(uint256 => address) private _tokenSuppliers;

    // Mapping to store expiration timestamps for reservations
    mapping(uint256 => uint256) private _expirationTimestamps;

    // Events for logging significant actions
    event SupplierRegistered(address indexed supplier, string supplierName);
    event TokenReservation(
        address indexed reservedFor,
        uint256 indexed tokenId,
        uint256 expirationTimestamp
    );
    event TokenBought(uint256 indexed tokenId, address indexed buyer);

    // Constructor to initialize the contract with default admin and minter roles
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // Function to mint a new token with a reservation for a specific address and expiration timestamp
    function safeMint(
        address reservedFor,
        string memory uri,
        uint256 expirationTimestamp
    ) public onlyRole(MINTER_ROLE) {
        require(
            expirationTimestamp > block.timestamp + 60,
            "BookingToken: Expiration timestamp must be at least 60 seconds in the future"
        );

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
        _reservedFor[tokenId] = reservedFor;
        _tokenSuppliers[tokenId] = msg.sender;
        _expirationTimestamps[tokenId] = expirationTimestamp;

        emit TokenReservation(reservedFor, tokenId, expirationTimestamp);
    }

    // Function to register a supplier with a name
    function registerSupplier(string memory supplierName) public {
        require(bytes(supplierName).length > 0, "BookingToken: Supplier name cannot be empty");
        _grantRole(MINTER_ROLE, msg.sender);
        _supplierNames[msg.sender] = supplierName;
        emit SupplierRegistered(msg.sender, supplierName);
    }

    // Function to allow a reserved address to buy the token
    function buy(uint256 tokenId) public {
        require(
            _reservedFor[tokenId] == msg.sender,
            "BookingToken: You do not have a reservation for this token"
        );
        require(
            block.timestamp < _expirationTimestamps[tokenId],
            "BookingToken: Token reservation has expired"
        );
        address owner = ownerOf(tokenId);
        _transfer(owner, msg.sender, tokenId);
        delete _reservedFor[tokenId];
        delete _expirationTimestamps[tokenId];
        emit TokenBought(tokenId, msg.sender);
    }

    // Function to get the supplier name of a given address
    function getSupplierName(address supplier) public view returns (string memory) {
        return _supplierNames[supplier];
    }

    // Function to get the supplier of a given token ID
    function getTokenSupplier(uint256 tokenId) public view returns (address) {
        return _tokenSuppliers[tokenId];
    }

    // The following functions are overrides required by Solidity

    // Override function to get the token URI
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    // Override function to support interface checks
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
