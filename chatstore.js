// facilities for storing chats.

const fs = require("./fsasync.js");


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
