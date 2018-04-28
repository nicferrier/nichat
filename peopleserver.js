// People storage - somehow proxy this through to a pluggable app

const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require("crypto");

const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const http = require("http");

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

let users = {};

function checkPassword(email, password) {
    let user = users[email];
    if (user === undefined) {
        return false;
    }
    return user.password == password;
}

exports.boot = function (port, options) {
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
                 console.log("people photofile, params",
                             req.get("Content-Type"),
                             photoFile,
                             email);
                 if (photoFile == null) {
                     if (checkPassword(email, password)) {
                         response.sendStatus(401);
                         return;
                     }
                 }
                 else {
                     // check register first
                     users[email] = {
                         photo: photoFile,
                         password: password
                     };  // don't forget to save it
                     
                 }
                 response.cookie("nichat", email + ":" + password); // should hash it
                 response.redirect("/nichat/");
             });

    app.get("/nichat/people$", function (req, response) {
        // Filter out the unnnecessary keys
        let usersJson = {};
        Object.keys(users).forEach(email => {
            let { photo } = users[email];
            usersJson[email] = { photo: photo };l
        });
        response.json(usersJson);
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

    let listener = app.listen(0, "localhost", function () {
        // how to get a random port?
        console.log("listening on ", listener.address().port);
    });
};

exports.boot(8082);

// end of people
