// fsasync stuff

const fs = require("fs");

fs.readFileAsync = function (filename) {
    return new Promise(function (resolve, reject) {
        try {
            fs.readFile(filename, "utf8", function (err, buffer) {
                if (err) reject(err);
                else resolve(buffer);
            });
        }
        catch (err) {
            reject(err);
        }
    });
};

fs.writeFileAsync = function (filename, data) {
    return new Promise(function (resolve, reject) {
        try {
            fs.writeFile(filename, data, "utf8", function (err) {
                if (err) reject(err);
                else resolve();
            });
        }
        catch (err) {
            reject(err);
        }
    });
};

fs.statAsync = function (path) {
    return new Promise(function (resolve, reject) {
        try {
            fs.stat(path, function (statObj, err) {
                if (err) reject(err);
                else resolve(statObj);
            });
        }
        catch (err) {
            reject(err);
        }
    });
};

fs.existsAsync = function (path) {
    return new Promise((resolve, reject) => {
        try {
            fs.access(path, fs.constants.R_OK | fs.constants.W_OK, err => {
                if (err) resolve(false);
                else resolve(true);
            });
        }
        catch (err) {
            reject(err);
        }
    });
};

fs.mkdirAsync = function (path) {
    return new Promise((resolve, reject) => {
        try {
            fs.mkdir(path, err => {
                if (err) reject(err);
                else resolve(true);
            });
        }
        catch (err) {
            reject(err);
        }
    });
};

exports = fs;

// fsasync.js ends here

