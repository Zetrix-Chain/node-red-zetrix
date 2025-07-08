/**
 * Copyright 2013 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/


module.exports = function (RED) {
    "use strict";

    const BigNumber = require('bignumber.js');

    function ContractInvokeNode(n) {
        RED.nodes.createNode(this, n);
        this.client = RED.nodes.getNode(n.client);
        this.privateKey = n.privateKey;
        this.address = n.address;
        this.contractAddress = n.contractAddress;
        this.method = n.method;
        this.inputParams = n.inputParams;
        this.amount = n.amount;

        if (this.client) {
            var node = this;
            node.on('input', async function (msg) {
                const client = node.client.getClient();
                if (!client) {
                    node.status({fill: "red", shape: "ring", text: "client not initialized"});
                    node.error("Zetrix client not initialized");
                    return;
                }

                // Get transaction parameters from either the node configuration or the message
                const address = msg.payload?.address || node.address;
                const contractAddress = msg.payload?.contractAddress || node.contractAddress;
                const method = msg.payload?.method || node.method;
                const inputParams = msg.payload?.inputParams || node.inputParams;
                const privateKey = msg.payload?.privateKey || node.privateKey;

                node.trace("validating parameters...");

                if (!address) {
                    throw new Error("TX initiator address is required");
                }

                if (!privateKey) {
                    throw new Error("Private key is required");
                }

                if (!contractAddress) {
                    throw new Error("Contract address is required");
                }

                if (!method) {
                    throw new Error("Method is required");
                }

                let amount;
                // Check if amount is coming from msg.payload first
                if (msg.payload?.amount !== undefined) {
                    amount = msg.payload.amount;
                } else if (!node.amount || node.amount === "") {
                    throw new Error("Amount is required");
                } else if (node.amount.indexOf("${") !== -1) {
                    // This is an expression, evaluate it
                    try {
                        amount = RED.util.evaluateNodeProperty(node.amount, 'msg', node, msg);
                    } catch (err) {
                        throw new Error("Invalid amount expression: " + err.message);
                    }
                } else {
                    // This is a direct value
                    amount = parseFloat(node.amount);
                }

                // Validate the final amount value
                if (amount === undefined || amount === null || isNaN(amount)) {
                    throw new Error("Invalid amount value");
                }

                if (amount < 0) {
                    throw new Error("Amount must be greater than or equal to 0");
                }

                let parsedParams = {};
                if (inputParams !== null && inputParams !== undefined) {
                    if (typeof inputParams === 'string') {
                        try {
                            node.trace("parsing string inputParams: " + inputParams);
                            parsedParams = JSON.parse(inputParams);
                        } catch (e) {
                            throw new Error("Invalid input params JSON format");
                        }
                    } else if (typeof inputParams === 'object') {
                        node.trace("using object inputParams directly");
                        parsedParams = inputParams;
                    }
                }

                node.status({fill: "blue", shape: "dot", text: "invoking..."});

                try {

                    node.trace("starting the process...");

                    // Get nonce
                    const nonceResult = await client.account.getNonce(address);

                    node.trace("nonceResult: " + JSON.stringify(nonceResult, null, 2));

                    if (nonceResult.errorCode !== 0) {
                        throw new Error("Get nonce error");
                    }

                    var nonce = nonceResult.result.nonce;
                    nonce = new BigNumber(nonce).plus(1).toString(10);

                    // Create operation
                    const operationInfo = await client.operation.contractInvokeByGasOperation({
                        sourceAddress: address,
                        contractAddress: contractAddress,
                        amount: amount.toString(),
                        input: JSON.stringify({
                            method,
                            params: parsedParams,
                        })
                    });

                    node.trace("operationInfo: " + JSON.stringify(operationInfo, null, 2));

                    if (operationInfo.errorCode !== 0) {
                        throw new Error("Create operation error");
                    }

                    const operationItem = operationInfo.result.operation;

                    // Get fee
                    let feeData = await client.transaction.evaluateFee({
                        sourceAddress: address,
                        nonce,
                        operations: [operationItem],
                        signtureNumber: '100',
                    });

                    node.trace("feeData: " + JSON.stringify(feeData, null, 2));

                    if (feeData.errorCode !== 0) {
                        throw new Error("Unable to get fee");
                    }

                    let feeLimit = feeData.result.feeLimit;
                    let gasPrice = feeData.result.gasPrice;

                    // Build blob
                    const blobInfo = client.transaction.buildBlob({
                        sourceAddress: address,
                        gasPrice: gasPrice,
                        feeLimit: feeLimit,
                        nonce: nonce,
                        operations: [operationItem],
                    });

                    node.trace("blobInfo: " + JSON.stringify(blobInfo, null, 2));

                    // Sign blob
                    const signed = client.transaction.sign({
                        privateKeys: [privateKey],
                        blob: blobInfo.result.transactionBlob
                    })

                    node.trace("signed: " + JSON.stringify(signed, null, 2));

                    // Submit blob
                    let submitted = await client.transaction.submit({
                        signature: signed.result.signatures,
                        blob: blobInfo.result.transactionBlob
                    })

                    node.trace("submitted: " + JSON.stringify(submitted, null, 2));

                    if (submitted.errorCode !== 0) {
                        throw new Error("Error while submitting transaction");
                    }

                    msg.payload = {
                        success: true,
                        hash: submitted.result.hash
                    };
                    node.status({fill: "green", shape: "dot", text: "Success"});
                    node.send(msg);

                } catch (error) {
                    node.error("Error processing transaction: " + error.message, msg);
                    node.status({fill: "red", shape: "ring", text: "Error"});
                }
            });

            node.on('close', function () {
                node.status({});
            });
        } else {
            this.error("Zetrix client not configured");
        }
    }

// Add this registration with credentials
    RED.nodes.registerType("contract-invoke", ContractInvokeNode);

}
