// facilities for storing chats.

const fs = require("./fsasync.js");
const path = require("path");


// File based interface

exports.getChat = async function (name, outFunc) {
    let filename = "chat-store/" + name + ".json";
    console.log("getChat file", filename);
    let fileData = await fs.promises.readFile(filename);
    let json = JSON.parse(fileData);
    return json;
};

async function makeDirs (path) {
    let exists = await fs.promises.exists(path);
    if (!exists) {
        await fs.promises.mkdir(path);
    }
}

async function readJson(path) {
    let fileData = await fs.promises.readFile(path);
    let jsonData = JSON.parse(fileData);
    return jsonData;
}

exports.saveChat = async function (chat, from, to, text, date) {
    let dir = "chat-store";
    await makeDirs(dir);
    let filename = dir + "/" + chat + ".json";
    let filenameExists = await fs.promises.exists(filename);
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
    await fs.promises.writeFile(filename, JSON.stringify(json, null, 2));
}



// SQL interface

async function sqlFile(file) {
    let fileName = path.join(__dirname, "app-sql-chat", file);
    let sql = await fs.promises.readFile(fileName);
    return sql;
}

exports.makeAPI = function (dbClient) {
    return {
        makeChat: async function(inviteeList) {
            if (inviteeList.length < 2) {
                throw new Error("invitee list too small");
            }
            
            let sql = await sqlFile("make-chat.sql");
            let result = await dbClient.query(sql, [JSON.stringify(inviteeList)]);
            let { rowCount, rows } = result;
            if (rowCount < 1) {
                throw new Error("make chat returned too few rows");
            }
            let [{ name } ] = rows;
            return name;
        },

        getChats: async function(userFor) {
            console.log("getChats", userFor);
            let sql = await sqlFile("get-chats.sql");
            let result = await dbClient.query(sql, [userFor]);
            let { rowCount, rows } = result;
            if (rowCount < 1) {
                return []
            }
            else {
                return rows.map(row => {
                    return {
                        "spaceName": row.name,
                        "members": row.members
                    };
                });
            }
        },

        getChat: async function(chatName) {
            let sql = await sqlFile("get-chat.sql");
            let result = await dbClient.query(sql, [chatName]);
            let { rowCount, rows } = result;
            if (rowCount < 1) {
                return []
            }
            else {
            }
        },

        // ignoring the date for now
        saveChat: async function (chat, from, to, text, date) {
            let sql = await sqlFile("add-message.sql");
            let result = await dbClient.query(sql, [chat, from, to, text]);
            let { rowCount, rows } = result;
            if (rowCount < 1) {
                return []
            }
            else {
            }
        }
    };
};



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
