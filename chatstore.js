// Facilities for storing chats.

const fs = require("./fsasync.js");
const path = require("path");

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
            let jsonInviteeList = JSON.stringify(inviteeList);
            let result = await dbClient.query(sql, [jsonInviteeList]);
            let { rowCount, rows } = result;
            if (rowCount < 1) {
                throw new Error("make chat returned too few rows");
            }
            let [{ makechat } ] = rows;
            return makechat;
        },

        getChats: async function(userFor) {
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
                return result.rows;
            }
        },

        getArtifact: async function (fileName) {
            let sql = await sqlFile("get-artifact-file.sql");
            try {
                let result = await dbClient.query(sql, [fileName]);
                let { rows } = result;
                if (rows.length < 1) {
                    return { error: new Error("not found") };
                }
                else {
                    let [ row ] = rows;
                    let { data } = row;
                    let binary = Buffer.from(data, 'base64');
                    return { data: binary };
                }
            }
            catch (e) {
                console.log("error", e);
                return { error: e };
            }
        },

        saveArtifact: async function (artifactFile) {
            let sql = await sqlFile("add-artifact.sql");
            let artifactFileData = await fs.promises.readFile(artifactFile.path, "base64");
            let result = await dbClient.query(sql, [artifactFile.filename, artifactFileData]);
            let { rowCount, rows } = result;
            let [ { filename } ] = rows;
            return filename;
        },

        // ignoring the date for now
        saveChat: async function (chatName, from, to, text, date) {
            let jsonData = JSON.stringify(text);
            let sql = await sqlFile("add-message.sql");
            let result = await dbClient.query(sql, [chatName, from, to, jsonData]);
            let { rowCount, rows } = result;
            if (rowCount < 1) {
                return []
            }
            else {
            }
        }
    };
};

// end
