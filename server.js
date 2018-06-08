// nichat server
// Copyright (C) 2018 by Nic Ferrier

const fs = require('./fsasync.js');
const path = require('path');
const { URL } = require('url');
const crypto = require("crypto");
const { spawn } = require("child_process");
const { Transform } = require("stream");

const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const indexer = require("serve-index");
const SSE = require("sse-node");
const http = require("http");
const proxy = require('express-http-proxy');
const cookieParser = require('cookie-parser');
const db = require("./sqlapply.js");
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const fetch = require("node-fetch");

const eliza = require("./eliza");
const chatstore = require("./chatstore.js");

const oneDaySecs = 1000 * 60 * 60 * 24;
const app = express();


function eventToHappen(eventFn) {
    return new Promise((resolve, reject) => {
        eventFn(resolve);
    });
}

let dbConfig = {
    user: 'nichat',
    database: 'chat',
    host: 'localhost',
    port: 5434
};

let dbClient = undefined;
let peopleProxyUrl = undefined;

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
    let chatAPI = null;

    app.use(cookieParser());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use("/nichat", express.static(rootDir));

    app.use(session({
        store: new pgSession({
            conObject: dbConfig
        }),
        secret: "destinedforgreatness",
        resave: false,
        name: "chat.id",
        cookie: { maxAge: 30 * oneDaySecs, httpOnly: false },
        saveUninitialized: false
    }));
    
    app.get("/", function (req, response) {
        console.log("redirecting to routed path /nichat");
        response.redirect("/nichat");
    });


    // Chat data sync between people service

    app.get("/nichat/chat-user", function (req, response) {
        console.log("chat-user", req.session.user);
        if (req.session.user == undefined) {
            response.sendStatus(404);
        }
        else {
            response.set("x-nichat-user", req.session.user);
            response.sendStatus(204);
        }
    });

    app.post("/nichat/chat-user", async function (req, response) {
        if (req.session.user == undefined) {
            let auth = req.get("x-nichat-chatauth");
            let path = "/nichat/welcome/auth-chat";
            let url = peopleProxyUrl + path;
            let authResponse = await fetch(url, {
                method: "POST",
                headers: {
                    "x-nichat-chatauth": auth
                }
            });
            // console.log("chat auth response", authResponse.status);
            let username = authResponse.headers.get("x-nichat-user");
            // console.log("chat auth username", username);
            req.session.user = username;
        }
        else {
            response.set("x-nichat-user", req.session.user);
        }
        response.sendStatus(204);
    });


    // Chat stuff
    
    app.get("/nichat/chats/", async function (req, response) {
        console.log("get chats for", req.session.user);
        if (req.session.user !== undefined) {
            let result = await chatAPI.getChats(req.session.user);
            // console.log("get chats", result);
            response.json(result);
        }
        else {
            response.json({});
        }
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

    let storage = multer.diskStorage({
        destination: "images",
        filename: storeImage
    })
    let mpParser = multer({storage: storage});
    let imageDir = __dirname + "/images";
    // app.use("/nichat/images", express.static(imageDir));

    app.get("/nichat/images/:image([A-Za-z0-9._-]+)", async (req, response) => {
        let { image } = req.params;
        console.log("image", image);
        let result = await chatAPI.getArtifact(image);
        if (result.error === undefined) {
            response.set("content-type", "image/png");
            response.send(result.data);
        }
        else {
            response.sendStatus(404);
        }
    });

    // Handle invites
    app.post("/nichat/chat/",
             mpParser.fields([]),
             async function (req,response) {
                 console.log("chat create POST");
                 let { invite } = req.body;
                 // FIXME check invite has "this" user in it
                 console.log("toInvite", invite);
                 let chatName = await chatAPI.makeChat(invite);
                 console.log("chat chatName", chatName);
                 response.set("location", chatName);
                 response.sendStatus(201);
             });

    app.get("/nichat/chat/:collection([A-Za-z0-9-]+)",
            async function (req, response) {
                let { collection } = req.params;
                console.log("chat collection", collection);

                let { json } = req.query;
                if (json == "1") {
                    response.status(200);
                    let { members, messages } = await chatAPI.getChat(collection);
                    if (messages.length > 0) {
                        let msgs = messages.map(chat => {
                            return {
                                from: chat.from,
                                to: chat.to,
                                datetime: chat.when,
                                text: chat.msg
                            }});
                        let json = {
                            url: messages[0].to,
                            name: messages[0].chatname,
                            members: members,
                            messages: msgs
                        };
                        response.json(json);
                    }
                    else {
                        response.json({
                            members: members,
                            messages: []
                        });
                    }
                }
                else {
                    let path = process.cwd() + "/www/index.html";
                    console.log("path", path);
                    response.sendFile(path);
                }
            });

    app.post("/nichat/chat/:collection([A-Za-z0-9-]+);imageUpload",
             mpParser.single("image"),
             async function (req, response) {
                 console.log("image uploader");
                 let imageFile = req.file;
                 console.log("image uploader got file", imageFile);
                 let dbFilename = await chatAPI.saveArtifact(imageFile);
                 response.set("Location", "/nichat/images/" + dbFilename);
                 response.sendStatus(201);
             });

    app.post("/nichat/chat/:collection([A-Za-z0-9-]+)",
             mpParser.fields([]),
             async function (req, response) {
                 console.log("collection got message post", req.body, req.url);
                 let data = req.body;
                 let { from, to, text } = data;
                 let textJson = JSON.parse(text);
                 data.text = textJson;
                 let urlArray = req.url.split("/");
                 let chatName = urlArray[urlArray.length - 1];
                 data.chatName = chatName;
                 console.log("chat post - name", chatName, "data", data);
                 await chatAPI.saveChat(chatName, from, to, textJson, new Date());
                 Object.keys(connections).forEach(connectionKey => {
                     let connection = connections[connectionKey];
                     data["type"] = "from";
                     console.log("exchange sending chat to", connectionKey, data);
                     connection.send(data, "chat");
                 });
                 response.sendStatus(204);
             });

    let grep = function (regex, fn) {
        return new Transform({
            transform(chunk, encoding, callback) {
                let dataBuf = chunk.toString();
                dataBuf.split("\n").forEach(line => {
                    let result = regex.exec(line);
                    if (result != null) {
                        fn(result);
                    }
                });
                this.push("peopleserver::" + dataBuf);
                callback();
            }
        });
    }

    let child; // make this outside to stop it dieing
    app.listen(port, "localhost", async function () {
        let proxyOptions = {
            parseReqBody: false,
            reqAsBuffer: true,
            reqBodyEncoding: null
        };

        // Init the sql
        dbClient = await db.initDb(__dirname + "/sql-chat", dbConfig);

        // Init the chat API
        chatAPI = chatstore.makeAPI(dbClient);
        

        // Start the peopleserver
        let nodeBin = process.argv[0];
        child = spawn(nodeBin, ["peopleserver.js"]);
        child.stderr.pipe(process.stderr);
        child.stdout
            .pipe(grep(/listening on[ ]+([0-9]+)/,
                       (res => child.emit("listening", res))))
            .pipe(process.stdout);

        // Catch the exit
        let onListen = proc => child.on("listening", proc);
        let result = await eventToHappen(onListen);
        let [_, portStr] = result;
        let port = parseInt(portStr); // set port

        peopleProxyUrl = "http://localhost:" + port;
        let proxyFunc = proxy(peopleProxyUrl, proxyOptions);
        console.log("url to talk to proxy", peopleProxyUrl);
        
        // Handle the proxy
        app.all(new RegExp("/nichat/welcome"), function (req, response) {
            // console.log("proxy", req.url);
            // console.log("cookies received", req.cookies);
            proxyFunc(req, response);
        });
        
        app.all(new RegExp("/nichat/people"), function (req, response) {
            // console.log("cookies received", req.cookies);
            proxyFunc(req, response);
        });

        console.log("listening on " + port);
        eliza.start(dbClient);
    });
};

exports.boot(8081);

// server.js ends here
