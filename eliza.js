const EventSource = require("eventsource");
const FormData = require('form-data');
const ElizaBot = require("./elizabot.js");

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

exports.start = function () {
    console.log("setting up eliza");
    let eliza = new ElizaBot();
    eliza.getInitial("hello eliza");
    var es = new EventSource("http://localhost:8081/nichat/comms");
    es.addEventListener("chat", ev => {
        let packet = JSON.parse(ev.data);
        console.log("eliza packet", packet);
        let { from, text, to } = packet;
        if (to.startsWith("http://localhost:8081/nichat/chat/audreyandnic")
            && from != "audrey@localhost") {
            let plainText = joinMap(text);
            let waitMs = Math.floor(Math.random() * Math.floor(4000));
            setTimeout(function () {
                let elizaSays = eliza.transform(plainText);
                console.log("eliza reply", elizaSays);
                let form = new FormData();
                form.append("from", "audrey@localhost",);
                form.append("to", to);
                form.append("text", JSON.stringify([elizaSays]));
                let url = "http://localhost:8081/nichat/chat/audreyandnic?json=1";
                form.submit(url, (err, res) => {
                    console.log("response to eliza post", res.statusCode);
                });
            }, waitMs);
        }
    });
}

// eliza.js ends here
