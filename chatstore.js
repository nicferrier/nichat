// facilities for storing chats.

const fs = require("fs");

fs.readFileAsync = function (filename) {
    return new Promise(function (resolve, reject) {
        try {
            fs.readFile(filename, "utf8", function (err, buffer) {
                if (err) reject(err);
                else resolve(buffer);
            });
        } catch (err) {
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
        } catch (err) {
            reject(err);
        }
    });
};

exports.saveChat = async function (chat, from, to, text, date) {
    let filename = "example-chats/" + chat + ".json";
    console.log("chatstore filename", filename);
    let data = await fs.readFileAsync(filename);
    let json = JSON.parse(data);
    console.log("json", json);
    let dateNum = date.valueOf();
    json.messages.push({
        "datetime": dateNum,
        "from": from,
        "to": to,
        "text": text
    });
    await fs.writeFileAsync(filename, JSON.stringify(json, null, 2));
}

// end
