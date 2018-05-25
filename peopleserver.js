// People storage - somehow proxy this through to a pluggable app
// Copyright (C) 2018 by Nic Ferrier

const fs = require('./fsasync.js');
const path = require('path');
const { URL } = require('url');
const crypto = require("crypto");
const { spawn } = require("child_process");

const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const http = require("http");
const db = require("./sqlapply.js");
const bcrypt = require("bcrypt");
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const adjectives = require("./adjectives.js");

const app = express();

const oneDaySecs = 24 * 60 * 60 * 1000;
const secret = "destinedforgreatness";

let dbConfig = {
    user: 'nichat',
    database: 'nichat',
    host: 'localhost',
    port: 5434
};
 
// multer storage function, reusable for different image stores
function storeImage (req, file, callback) {
    crypto.pseudoRandomBytes(16, function(err, raw) {
        if (err) return callback(err);
        let extension = path.extname(file.originalname);
        let newFilename = raw.toString('hex') + extension;
        callback(null, newFilename);
    });
}

function bcHash (value, seed) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(value, seed, function(err, hash) {
            if (err) reject(err);
            else resolve(hash);
        });
    });
};

function bCompare (value, hash) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(value, hash, function(err, result) {
            if (err) reject(err);
            else resolve(result);
        });
    });
};

function rnd (max) {
    return Math.floor(Math.random() * Math.floor(max));
}


let pgChild = undefined;
let dbClient = undefined;

// eg: checkPassword("nic@ferrier.me.uk", "secretthing");
async function checkPassword(email, password) {
    let sql = "select password "
        + "from user_password p, chat_user u "
        + "where u.id=p.id and u.email = $1 and u.enabled=true";
    try {
        let result = await dbClient.query(sql, [email]);
        let {rows} = result;
        let [row] = rows;
        let { password:hashedPassword } = row;
        let isEqual = await bCompare(password, hashedPassword);
        return isEqual;
    }
    catch (e) {
        console.log("checkPassword failed", e);
        return false;
    }
}

async function saveUser(email, password, photoFile) {
    try {
        let encPassword = await bcHash(password, 10);
        let photoFileData = await fs.promises.readFile(photoFile.path, "base64");
        await dbClient.query("select make_user($1, $2, $3, $4);", [
            email,
            email,
            encPassword,
            photoFileData
        ]);
    }
    catch (e) {
        console.log("error hashing", e);
    }
}

async function getAccountPhoto(email, response) {
    let fileName = path.join(__dirname, "app-sql-people", "account-photo.sql");
    let sql = await fs.promises.readFile(fileName);
    try {
        let result = await dbClient.query(sql, [email]);
        let {rows} = result;
        // console.log("rows", rows);
        if (rows.length < 1) {
            response.sendStatus(404);
        }
        else {
            let [{data}] = rows;
            let binary = Buffer.from(data, 'base64');
            response.set("Content-Type", "image/jpg");
            response.send(binary);
        }
    }
    catch (e) {
        console.log("getAccountPhoto", e);
    }
}

async function listPeople() {
    try {
        let fileName = path.join(__dirname, "app-sql-people", "people-list.sql");
        let sql = await fs.promises.readFile(fileName);
        let peopleResult = await dbClient.query(sql);
        let {rows} = peopleResult;
        return rows;
    }
    catch (e) {
        console.log("can't list users", e);
    }
}

async function findAuthToken(authToken) {
    try {
        console.log("searching for authToken");
        let fileName = path.join(__dirname, "app-sql-people", "onetime-auth.sql");
        let sql = await fs.promises.readFile(fileName);
        let userResult = await dbClient.query(sql, [authToken]);
        let {rows} = userResult;
        console.log("findAuthToken rows", rows);
        return rows[0];
    }
    catch (e) {
        console.log("can't find auth token", e);
    }
}

exports.boot = async function (options) {
    let opts = options != undefined ? options : {};
    let rootDir = opts.rootDir != undefined ? opts.rootDir : __dirname + "/www";
    let jsFile = opts.jsFile != undefined ? opts.jsFile : "/index.js";

    app.use(cookieParser());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    app.use(session({
        store: new pgSession({
            conObject: dbConfig
        }),
        secret: secret,
        resave: false,
        cookie: { maxAge: 30 * oneDaySecs, httpOnly: false },
        saveUninitialized: false
    }));


    // Just used to make names up - just because it's easier to test
    app.get("/nichat/welcome/name", function (req, response) {
        let word1 = adjectives[rnd(adjectives.length)];
        let word2 = adjectives[rnd(adjectives.length)];
        response.json({ word1: word1, word2: word2 });
    });

    app.get("/nichat/welcome$", function (req, response) {
        console.log("welcome");
        let path = process.cwd() + "/www/welcome.html";
        response.sendFile(path);
    });

    app.post("/nichat/welcome/chat-authenticate", async function (req, response) {
        try {
            if (req.session.user !== undefined) {
                // console.log("chat authenticate");
                let word =  secret + (new Date().toISOString());
                req.session.onetime = await bcHash(word, 10);
                req.session.save();
                response.set("x-nichat-chatauth", req.session.onetime);
            }
        }
        catch (e) {
            // used for control flow of req.session.user throwing
        }
        response.sendStatus(204);
    });

    app.post("/nichat/welcome/auth-chat", async function (req, response) {
        let onetime = req.get("x-nichat-chatauth");
        let userResult = await findAuthToken(onetime);
        if (userResult != null && userResult !== undefined) {
            // console.log("auth-chat found user", userResult.user);
            response.set("x-nichat-user", userResult.user);
        }
        response.sendStatus(204);
    });


    app.get("/", function (req, response) {
        console.log("root!");
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
                 // params  { email: 'nic@ferrier.me.uk', password: 'jqwdknwqdnq' }
                 let photoFile = req.file;
                 let { email, password } = req.body;
                 if (photoFile === undefined && req.body.selectedPhoto === undefined) {
                     if (checkPassword(email, password)) {
                         response.sendStatus(401);
                         return;
                     }
                 } // We use this to make a nice simple registration flow work
                 else if (req.body.selectedPhoto !== undefined) {
                     let imageName = req.body.selectedPhoto;
                     console.log("imageName", imageName);
                     let imagePath = "www/photos/" + imageName + ".jpg";
                     saveUser(email, password, { path: imagePath });
                 }
                 else {
                     // FIXME: check register first
                     saveUser(email, password, photoFile);
                 }

                 console.log("making a session with user", email);
                 req.session.user = email;
                 req.session.save();
                 response.redirect("/nichat/");
             });
    
    app.get("/nichat/people$", async function (req, response) {
        let users = await listPeople();
        response.json(users);
    });

    app.get("/nichat/people/_$", async function (req, response) {
        if (req.session["user"] === undefined) {
            console.log("no user in the session");
            response.sendStatus(404);
            return;
        }
        let user = req.session.user;
        console.log("session user", req.session.user);
        response.set("x-nichat-user", req.session.user);
        response.sendStatus(204);
    });

    app.get("/nichat/people/_/photo", function (req, response) {
        console.log("session keys", Object.keys(req.session));
        if (req.session["user"] === undefined) {
            console.log("no user in the session");
            response.sendStatus(404);
            return;
        }
        let user = req.session.user;
        response.redirect("/nichat/people/" + user + "/photo");
    });

    app.get("/nichat/people/:user([@A-Za-z0-9.-]+)/photo", function (req, response) {
        let { user } = req.params;
        getAccountPhoto(user, response);
    });

    app.get("/nichat/people/:user([@A-Za-z0-9.-]+)", function (req, response) {
        let { user } = req.params;
        let data = users[user];
        delete data.password;
        response.json(data);
    });

    let listener = app.listen(0, "localhost", async function () {
        // bootDocker();
        // Start the db
        try {
            dbClient = await db.initDb(__dirname + "/sql-people", dbConfig);
        }
        catch (e) {
            dbClient = await db.initDb(__dirname + "/sql-people", dbConfig);
        }
        //await dbClient.end();

        // how to get a random port?
        console.log("listening on ", listener.address().port);
    });
};

exports.boot();

// end of people
