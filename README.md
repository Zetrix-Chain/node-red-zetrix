# node-red-zetrix

[![platform](https://img.shields.io/badge/platform-Node--RED-red)](https://nodered.org)
![NPM](https://img.shields.io/npm/l/node-red-dashboard)

A collection of [Node-RED](https://nodered.org) nodes for interacting with the Zetrix blockchain. This package enables you to perform transactions, query smart contracts, and invoke smart contract methods on the Zetrix network.

## Features

- **Zetrix Client Configuration**: Configure connection to Zetrix mainnet or testnet
- **Transaction Node**: Send ZETRIX tokens between addresses
- **Contract Query Node**: Query data from smart contracts
- **Contract Invoke Node**: Execute smart contract methods with transactions

## Installation

Run the following command in your Node-RED user directory (typically `~/.node-red`):

```
npm install node-red-zetrix
```

## Usage

### Zetrix Client Configuration

Before using any of the nodes, you need to configure a Zetrix client:

1. Add Zetrix node (Testnet or Mainnet) to your flow
2. Double-click to configure
3. Click the edit icon next to the "Zetrix Client" field
4. Select network (Testnet or Mainnet)
5. Give your configuration a name (optional)
6. Click Add

### Transaction Node

Send ZETRIX tokens between addresses:

- **Sender Address**: The source address
- **Private Key**: Private key of the sender
- **Recipient Address**: The destination address
- **Amount**: Amount of ZETRIX to send

Parameters can be set in the node configuration or injected via `msg.payload`:

```javascript
msg.payload = { 
    senderAddress: "your-address", 
    privateKey: "your-private-key", 
    recipientAddress: "recipient-address", 
    amount: "10" // Without decimal 
}
```

### Contract Query Node

Query data from smart contracts:

- **Contract Address**: Address of the smart contract
- **Method**: Name of the method to query
- **Input Params**: JSON object of parameters

Example payload:

```javascript
msg.payload = { 
    contractAddress: "contract-address", 
    method: "getBalance", 
    inputParams: {
        "address": "user-address"
    } 
}
```

### Contract Invoke Node

Execute smart contract methods:

- **Contract Address**: Address of the smart contract
- **Method**: Name of the method to invoke
- **Input Params**: JSON object of method parameters
- **Sender Address & Private Key**: Required for transaction signing

## Response Format

All nodes return responses in the following format:

```javascript
msg.payload = { 
    success: true, 
    result: { 
        // Response data specific to the operation
    } 
}
```


## Error Handling

Errors are emitted as Node-RED errors and will set the node status to red. The error message can be caught using Node-RED's catch node.

## Dependencies

- Node-RED >= 2.0.0
- zetrix-sdk-nodejs: 1.0.2

## License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

## Author

Ammar Abdullah (ammar.abdullah@myeg.com.my)

## Links

- [Zetrix Website](https://zetrix.com)
- [Node-RED](https://nodered.org)

