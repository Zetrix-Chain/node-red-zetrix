module.exports = function (RED) {
    "use strict";
    const ZtxChainSDK = require('zetrix-sdk-nodejs');

    function ZetrixClientNode(n) {
        RED.nodes.createNode(this, n);
        this.url = n.url;
        var node = this;

        // Function to initialize SDK
        this.initializeSDK = function () {
            try {
                this.sdk = new ZtxChainSDK({
                    host: this.url,
                    secure: true,
                });
                this.connected = true;
                this.status({fill: "green", shape: "dot", text: "connected"});
            } catch (error) {
                this.error("Failed to initialize Zetrix client: " + error.message);
                this.connected = false;
                this.status({fill: "red", shape: "ring", text: "disconnected"});
            }
        }

        // Initial SDK setup
        this.initializeSDK();

        this.getClient = function () {
            return this.sdk;
        };

        // Listen for configuration updates
        node.on('input', function (msg) {
            if (msg.url && msg.url !== node.url) {
                node.url = msg.url;
                node.initializeSDK();
            }
        });

        // Re-initialize when deployed with new configuration
        node.on('close', function (done) {
            node.status({});
            done();
        });

    }

    RED.nodes.registerType("ZetrixClient", ZetrixClientNode);
}
