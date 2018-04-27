
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require("crypto");

const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const indexer = require("serve-index");
const SSE = require("sse-node");
const http = require("http");

const eliza = require("./eliza");
const chatstore = require("./chatstore.js");

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

// multer storage function, reusable for different image stores
function storeImage (req, file, callback) {
    crypto.pseudoRandomBytes(16, function(err, raw) {
        if (err) return callback(err);
        let extension = path.extname(file.originalname);
        let newFilename = raw.toString('hex') + extension;
        callback(null, newFilename);
    });
}

exports.boot = function (port, options) {
    let opts = options != undefined ? options : {};
    let rootDir = opts.rootDir != undefined ? opts.rootDir : __dirname + "/www";
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

    // People storage - somehow proxy this through to a pluggable app

    app.get("/nichat/welcome", function (req, response) {
        let path = process.cwd() + "/www/welcome.html";
        response.sendFile(path);
    });

    let peoplePhotoStorage = multer.diskStorage({
        destination: "photo",
        filename: storeImage
    })
    let mpParserPhoto = multer({storage: peoplePhotoStorage});
    let photoDir = __dirname + "/photo";
    app.use("/nichat/photo", express.static(photoDir));
    app.post("/nichat/welcome",
             mpParserPhoto.single("photo"),
             function (req, response) {
                 let photoFile = req.file;
                 console.log("photo uploader got file", photoFile,
                             " and params ", req.body);
                 response.sendStatus(204);
             });

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



    // Chats

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

    app.get("/nichat/chat/:collection([A-Za-z0-9-]+)",
            async function (req, response) {
                let { collection } = req.params;
                let { json } = req.query;
                if (json == "1") {
                    response.status(200);
                    let chatJson = await chatstore.getChat(collection);
                    response.json(chatJson)
                }
                else {
                    let path = process.cwd() + "/www/index.html";
                    console.log("path", path);
                    response.sendFile(path);
                }
            });

    let storage = multer.diskStorage({
        destination: "images",
        filename: storeImage
    })
    let mpParser = multer({storage: storage});
    let imageDir = __dirname + "/images";
    app.use("/nichat/images", express.static(imageDir));
    /* 
       TODO

       when a chat is posted with an image reference in it, rewrite
       the img reference and move the img to the relevant chat store

     */
    app.post("/nichat/chat/:collection([A-Za-z0-9-]+);imageUpload",
             mpParser.single("image"),
             function (req, response) {
                 console.log("image uploader");
                 let imageFile = req.file;
                 console.log("image uploader got file", imageFile);
                 response.set("Location", "/nichat/" + imageFile.path);
                 response.sendStatus(201);
             });

    app.post("/nichat/chat/:collection([A-Za-z0-9-]+)",
             mpParser.fields([]),
             function (req, response) {
                 console.log("collection got message post", req.body, req.url);
                 let data = req.body;
                 let { from, to, text } = data;
                 let textJson = JSON.parse(text);
                 data.text = textJson;
                 let urlArray = req.url.split("/");
                 let chatName = urlArray[urlArray.length - 1];
                 console.log("chat post - name", chatName, "data", data);
                 chatstore.saveChat(chatName, from, to, textJson, new Date());
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
