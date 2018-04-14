const clients = new Array();
clients.length = 0;

const es = new EventSource("comms");


es.addEventListener("meta", metaEvt => {
    console.log("meta", metaEvt);
});

es.addEventListener("chat", chatEvt => {
    console.log("chatEvt", chatEvt);
});

onconnect = function (connectEvt) {
    let port = connectEvt.ports[0];
    clients.push(port);

    port.addEventListener("message", msgEvt => {
        try {
            let [data] = msgEvt.data;
            let {type} = data;
            if (type == "to") {
                let {message, space, from} = data;
                // can we tell what client this came from so we can go back to them?
                console.log("message send from", from,
                            "on space", space,
                            "msg?", message);
            }
            else {
                clients.forEach(clientPort => {
                    clientPort.postMessage(msgEvt);
                });
            }
        }
        catch (ex) {
            console.log("got an exception on a pushed message", msgEvt);
        }
    });

    port.start();
}

