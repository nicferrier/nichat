const EventSource = require("eventsource");
const FormData = require('form-data');
const ElizaBot = require("./elizabot.js");
const path = require("path");
const fs = require("./fsasync.js");

// We can get an eliza to talk, sort of like this
function testEliza () {
    let eliza = new ElizaBot();
    console.log(eliza.getInitial());
    console.log(eliza.transform("I've been wondering if you'd be a good test"));
}

function joinMap(map) {
    let result=[];
    let vals = function (o) {
        try {
            let foreach = Array.isArray(o)
                ? function (l) { o.forEach(l); }
                : (typeof(o) === "object")
                ? function (l) { Object.values(o).forEach(l); }
                : function (l) { [o].forEach(l); };
            foreach(v => {
                if (typeof(v) === "string") {
                    result.push(v);
                }
                else {
                    vals(v);
                }
            });
        }    
        catch(e) {
        }
    };
    vals(map);
    return result.join("");
}

async function sqlFile(file) {  // this is also in chatstore
    let fileName = path.join(__dirname, "app-sql-chat", file);
    let sql = await fs.promises.readFile(fileName);
    return sql;
}

// Should be keyed by a chat|identity and have an instance of Eliza
let elizaChats = {
};

function getEliza(chatName, correspondant, identity) {
    let key = chatName + "|" + identity;
    let elizaChat = elizaChats[key];
    if (elizaChat === undefined) {
        elizaChat = {
            correspondant: correspondant,
            identity: identity,
            eliza: new ElizaBot()
        };
        elizaChats[key] = elizaChat;
        elizaChat.eliza.getInitial("hello eliza");
    }
    return elizaChat;
}

exports.start = function (dbClient) {
    console.log("setting up eliza");
    let es = new EventSource("http://localhost:8081/nichat/comms");
    es.addEventListener("chat", async ev => {
        let packet = JSON.parse(ev.data);
        let plainText = joinMap(packet.text);
        console.log("eliza packet", packet, "plainText>", plainText);

        if (plainText.startsWith("eliza be")) {
            let [_, who] = new RegExp("eliza be (.*)").exec(plainText);
            console.log("register eliza with", packet.chatName);
            let sql = await sqlFile("turn-on-eliza.sql");
            try {
                let result = await dbClient.query(
                    sql,
                    [packet.chatName, who, true]
                );
            }
            catch(e) {
                console.log("eliza could not register to", packet.chatName, e);
            }
        }

        let sql = await sqlFile("is-eliza-on.sql");
        let isElizaOn = await dbClient.query(sql, [packet.chatName]);
        let { is_on, identity: who } = isElizaOn.rows[0];
        if (is_on) {
            let { from, text, to } = packet;
            let { eliza, correspondant } = getEliza(packet.chatName, from);
            if (from == correspondant) {
                let waitMs = Math.floor(Math.random() * Math.floor(2000));
                
                setTimeout(function () {
                    let elizaSays = eliza.transform(plainText);
                    console.log("eliza reply", elizaSays);
                    let form = new FormData();
                    form.append("from", who);
                    form.append("to", to);
                    form.append("text", JSON.stringify([elizaSays]));
                    let url = packet.to + "?json=1";
                    form.submit(url, (err, res) => {
                        console.log("response to eliza post", res.statusCode);
                    });
                }, waitMs);
            }
        }
    });
}

// eliza.js ends here
