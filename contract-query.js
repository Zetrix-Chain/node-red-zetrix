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

    function ContractQueryNode(n) {
        RED.nodes.createNode(this, n);
        this.client = RED.nodes.getNode(n.client);
        this.contractAddress = n.contractAddress;
        this.method = n.method;
        this.inputParams = n.inputParams;

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
                const contractAddress = msg.payload?.contractAddress || node.contractAddress;
                const method = msg.payload?.method || node.method;
                const inputParams = msg.payload?.inputParams || node.inputParams;

                node.trace("validating parameters...");

                if (!contractAddress) {
                    throw new Error("Contract address is required");
                }

                if (!method) {
                    throw new Error("Method is required");
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

                node.status({fill: "blue", shape: "dot", text: "querying..."});

                try {

                    node.trace("starting the process...");

                    // Create operation
                    const resp = await client.contract.call({
                        optType: 2,
                        contractAddress: contractAddress,
                        input: JSON.stringify({
                            method,
                            params: parsedParams,
                        })
                    });

                    node.trace("operationInfo: " + JSON.stringify(resp, null, 2));

                    if (!resp || !resp.result || !resp.result.query_rets || !resp.result.query_rets[0]) {
                        throw new Error("Invalid response format");
                    }

                    if (resp.result.query_rets[0].error) {
                        throw new Error(`Query error: ${resp.result.query_rets[0].error}`);
                    }

                    let result;
                    try {
                        result = JSON.parse(resp.result.query_rets[0].result.value);
                    } catch (e) {
                        result = resp.result.query_rets[0].result.value;
                    }

                    msg.payload = {
                        success: true,
                        result: result
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
    RED.nodes.registerType("contract-query", ContractQueryNode);

}
