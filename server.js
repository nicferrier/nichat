
const fs = require('fs');
const { URL } = require('url');

const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const indexer = require("serve-index");
const SSE = require("sse-node");
const EventSource = require("eventsource");

const ElizaBot = require("./elizabot.js");

const mpParser = multer();


// We can get an eliza to talk, sort of like this
function testEliza () {
    let eliza = new ElizaBot();
    console.log(eliza.getInitial());
    console.log(eliza.transform("I've been wondering if you'd be a good test"));
}

function getChat (name, outFunc) {
    fs.readFile("example-chats/" + name + ".json", (err, data) => {
        if (err) throw err;
        let obj = JSON.parse(data);
        outFunc(obj);
    });
}


const app = express();

function getRemoteAddr(request) {
    let ip = request.headers["x-forwarded-for"]
        || request.connection.remoteAddress
        || request.socket.remoteAddress
        || request.connection.socket.remoteAddress;
    let remotePort = request.connection.remotePort;
    let remoteAddr = ip + ":" + remotePort;
    return remoteAddr;
}

function elizaStart() {
    console.log("setting up eliza");
    var es = new EventSource("http://localhost:8081/nichat/comms");
    es.addEventListener("chat", ev => {
        console.log("eliza got", ev);
    });
}

exports.boot = function (port, options) {
    let opts = options != undefined ? options : {};
    let rootDir = opts.rootDir != undefined ? opts.rootDir : "www";
    let jsFile = opts.jsFile != undefined ? opts.jsFile : "/index.js";

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    app.use("/nichat", express.static(rootDir));

    app.get("/", function (req, response) {
        console.log("redirecting to routed path /nichat");
        response.redirect("/nichat");
    });

    app.get("/nichat/people/", function (req, response) {
        console.log("request", request);
        response.sendStatus(204);
    });

    // What chats have you got?
    app.get("/nichat/chats/", function (req, response) {
        let chats = {
            "raj": { "spaceName": "rajandnic" },
            "audrey": { "spaceName": "audreyandnic" }
        };
        response.json(chats);
    });

    // Handle the distribution of chats
    const connections = {};
    
    app.get("/nichat/comms", function (req, response) {
        let remoteAddr = getRemoteAddr(req);
        console.log("wiring up comms from", remoteAddr);

        let connection = SSE(req, response, {ping: 10*1000});
        connection.onClose(closeEvt => {
            console.log("sse closed");
            delete connections[remoteAddr];
        });
        connections[remoteAddr] = connection;
        connection.send({remote: remoteAddr}, "meta");
    });

    app.get("/nichat/:collection([A-Za-z0-9-]+)/msg", function (req, response) {
        let { collection } = req.params;
        response.status(200);
        getChat(collection, function (data) {
            response.json(data)
        });
    });

    app.post("/nichat/:collection([A-Za-z0-9-]+)/msg",
             mpParser.fields([]),
             function (req, response) {
                 let data = req.body;
                 let { from, to, text } = data;
                 console.log("data", from, to, text);
                 Object.keys(connections).forEach(connectionKey => {
                   let connection = connections[connectionKey];
                   console.log("exchange sending chat to", connectionKey);
                   connection.send(data, "chat");
                 });
                 response.sendStatus(204);
             });
    
    app.listen(port, "localhost", function () {
        console.log("listening on " + port);
        elizaStart();
    });
};

exports.boot(8081);

// server.js ends here
