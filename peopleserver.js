// People storage - somehow proxy this through to a pluggable app
// Copyright (C) 2018 by Nic Ferrier

const fs = require('./fsasync.js');
const path = require('path');
const { URL } = require('url');
const crypto = require("crypto");

const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const http = require("http");
const db = require("./sqlapply.js");
const bcrypt = require("bcrypt");

const app = express();

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
        let photoFileData = await fs.readFileAsync(photoFile.path, "base64");
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
    let sql = "select data "
        + "from chat_user u, user_photo p "
        + "where p.user_id = u.id "
        + "and u.enabled=true "
        + "and u.email=$1";
    try {
        let result = await dbClient.query(sql, [email]);
        let {rows} = result;
        let [{data}] = rows;
        let binary = Buffer.from(data, 'base64');
        response.set("Content-Type", "image/png");
        response.send(binary);
    }
    catch (e) {
        console.log("getAccountPhoto", e);
    }
}

exports.boot = async function (options) {
    let opts = options != undefined ? options : {};
    let rootDir = opts.rootDir != undefined ? opts.rootDir : __dirname + "/www";
    let jsFile = opts.jsFile != undefined ? opts.jsFile : "/index.js";

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    app.get("/nichat/welcome", function (req, response) {
        console.log("welcome");
        let path = process.cwd() + "/www/welcome.html";
        response.sendFile(path);
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
                 if (photoFile == null) {
                     if (checkPassword(email, password)) {
                         response.sendStatus(401);
                         return;
                     }
                 }
                 else {
                     // check register first
                     saveUser(email, password, photoFile);
                 }
                 response.cookie("nichat", email + ":" + password);
                 response.redirect("/nichat/");
             });
    
    app.get("/nichat/people$", function (req, response) {
        // Filter out the unnnecessary keys
        /*
        let usersJson = {};
        Object.keys(users).forEach(email => {
            let { photo } = users[email];
            usersJson[email] = { photo: photo };l
        });
        response.json(usersJson);
        */
        response.sendStatus(204);
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
        // Start the db
        dbClient = await db.initDb(__dirname + "/sql-people", {
            user: 'nichat',
            database: 'nichat',
            host: 'localhost',
            port: 5432
        });
        //await dbClient.end();

        // how to get a random port?
        console.log("listening on ", listener.address().port);
    });
};

exports.boot();

// end of people
