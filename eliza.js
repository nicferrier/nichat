const EventSource = require("eventsource");
const FormData = require('form-data');
const ElizaBot = require("./elizabot.js");

// We can get an eliza to talk, sort of like this
function testEliza () {
    let eliza = new ElizaBot();
    console.log(eliza.getInitial());
    console.log(eliza.transform("I've been wondering if you'd be a good test"));
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
        if (to == "http://localhost:8081/nichat/audreyandnic/msg"
            && from != "audrey@localhost") {
            let waitMs = Math.floor(Math.random() * Math.floor(4000));
            setTimeout(function () {
                let elizaSays = eliza.transform(text);
                console.log("eliza reply", elizaSays);
                let form = new FormData();
                form.append("from", "audrey@localhost",);
                form.append("to", to);
                form.append("text", elizaSays);
                form.submit("http://localhost:8081/nichat/audreyandnic/msg", (err, res) => {
                    console.log("response to eliza post", res.statusCode);
                });
            }, waitMs);
        }
    });
}

// eliza.js ends here
