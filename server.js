
const fs = require('fs');
const { URL } = require('url');

const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const indexer = require("serve-index");
const SSE = require("sse-node");
const http = require("http");
const eliza = require("./eliza");

const mpParser = multer();
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

function getChat (name, outFunc) {
    let filename = "example-chats/" + name + ".json";
    console.log("getChat file", filename);
    fs.readFile(filename, (err, data) => {
        if (err) throw err;
        let obj = JSON.parse(data);
        outFunc(obj);
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


    const users = {
        "nicferrier@localhost": {
            "photo": "/nichat/photos/nic.jpg"
        },
        "rajesh.shah@localhost": {
            "photo": "/nichat/photos/raj.jpg"
        },
        "dan.flower@localhost": {
            "photo": "/nichat/photos/dan.jpg"
        },
        "audrey@localhost": {
            "photo": "/nichat/photos/audrey.jpg"
        }
    };

    app.get("/nichat/people/:user([@A-Za-z0-9.-]+)", function (req, response) {
        let { user } = req.params;
        console.log("got a user request", user);
        let data = users[user];
        response.json(data);
    });

    app.get("/nichat/people/", function (req, response) {
        console.log("people request", request);
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

    app.get("/nichat/chat/:collection([A-Za-z0-9-]+)", function (req, response) {
        let { collection } = req.params;
        let { json } = req.query;
        if (json == "1") {
            response.status(200);
            getChat(collection, function (data) {
                response.json(data)
            });
        }
        else {
            let path = process.cwd() + "/www/index.html";
            console.log("path", path);
            response.sendFile(path);
        }
    });

    app.post("/nichat/chat/:collection([A-Za-z0-9-]+)",
             mpParser.fields([]),
             function (req, response) {
                 console.log("collection received message post");
                 let data = req.body;
                 let { from, to, text } = data;
                 console.log("data", from, to, text);
                 Object.keys(connections).forEach(connectionKey => {
                     let connection = connections[connectionKey];
                     data["type"] = "from";
                     console.log("exchange sending chat to", connectionKey, data);
                     connection.send(data, "chat");
                 });
                 response.sendStatus(204);
             });
    
    app.listen(port, "localhost", function () {
        console.log("listening on " + port);
        eliza.start();
    });
};

exports.boot(8081);

// server.js ends here
