// facilities for storing chats.

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



exports.getChat = async function (name, outFunc) {
    let filename = "chat-store/" + name + ".json";
    console.log("getChat file", filename);
    let fileData = await fs.readFileAsync(filename);
    let json = JSON.parse(fileData);
    return json;
};


async function makeDirs (path) {
    let exists = await fs.existsAsync(path);
    if (!exists) {
        await fs.mkdirAsync(path);
    }
}

async function readJson(path) {
    let fileData = await fs.readFileAsync(path);
    let jsonData = JSON.parse(fileData);
    return jsonData;
}

exports.saveChat = async function (chat, from, to, text, date) {
    let dir = "chat-store";
    await makeDirs(dir);
    let filename = dir + "/" + chat + ".json";
    let filenameExists = await fs.existsAsync(filename);
    let json = filenameExists ? await readJson(filename) : {
        name: chat,
        members: [from, to],
        messages: []
    };
    let dateNum = date.valueOf();
    let newMessage = {
        "datetime": dateNum,
        "from": from,
        "to": to,
        "text": text
    };
    console.log("chatstore newMessage", newMessage);
    json.messages.push(newMessage);
    await fs.writeFileAsync(filename, JSON.stringify(json, null, 2));
}

function testcode () {
    chatstore.saveChat(
        "rajandnic",
        "rajesh.shah@localhost",
        "nicferrier@localhost",
        "I'm in new york, going for pancakes.",
        new Date()
    );
}

// end
