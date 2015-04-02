/*
 * Contains integration tests for all Startup-initiated events.
 */
"use strict";
// set up integration testing mocks
var proxyquire =  require('proxyquire');
var clientMock = require("../util/client-sdk-mock");
clientMock["@global"] = true; 
var ircMock = require("../util/irc-mock");
ircMock["@global"] = true;
var dbHelper = require("../util/db-helper");
var asapiMock = require("../util/asapi-controller-mock");

var ircService = null;

var ircConfig = {
    databaseUri: "mongodb://localhost:27017/matrix-appservice-irc-integration",
    servers: {
        "irc.example": {
            nick: "a_nick",
            expose: {
                channels: true,
                privateMessages: true
            },
            rooms: {
                mappings: {
                    "#coffee": ["!foo:bar"]
                }
            }
        }
    }
};
var serviceConfig = {
    hs: "https://some.home.server.goeshere",
    hsDomain: "some.home.server",
    hsToken: "foobar",
    token: "it's a secret",
    as: "https://mywuvelyapplicationservicerunninganircbridgeyay.gome",
    port: 2
};

describe("Initialisation", function() {
    // rip this from the config
    var ircAddr = Object.keys(ircConfig.servers)[0];
    var ircNick = ircConfig.servers[Object.keys(ircConfig.servers)[0]].nick;
    var ircChannel = Object.keys(
        ircConfig.servers[Object.keys(ircConfig.servers)[0]].rooms.mappings
    )[0];
    var databaseUri = ircConfig.databaseUri;

    var mockAsapiController = null;

    beforeEach(function(done) {
        console.log(" === Initialisation Test Start === ");
        ircMock._reset();
        clientMock._reset();
        dbHelper._reset(databaseUri).done(function() {
            done();
        });
        mockAsapiController = asapiMock.create();
        ircService = proxyquire("../../lib/irc-appservice.js", {
            "matrix-js-sdk": clientMock,
            "irc": ircMock
        });
    });

    it("should connect to the IRC network and channel in the config", 
    function(done) {
        // do the init
        ircService.configure(ircConfig);
        ircService.register(mockAsapiController, serviceConfig).then(function() {
            var ircClient = ircMock._findClient(ircAddr, ircNick);
            expect(ircClient).toBeDefined();
            expect(ircClient.connect).toHaveBeenCalled();
            expect(ircClient.join).not.toHaveBeenCalled();
            // invoke the connect callback
            return ircClient._triggerConnect();
        }).then(function(client) {
            // check it joins the right channel
            expect(client.join).toHaveBeenCalled();
            expect(client.join.calls[0].args[0]).toEqual(ircChannel);
            done();
        }).done();
    });
});