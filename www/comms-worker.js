const clients = new Array();
clients.length = 0;

const es = new EventSource("comms");


es.addEventListener("meta", metaEvt => {
    console.log("meta", metaEvt);
});

es.addEventListener("chat", chatEvt => {
    console.log("chatEvt", chatEvt);
});


function sendChat (from, to, text) {
    let fd = new FormData();
    fd.append("from", from);
    fd.append("to", to);
    fd.append("text", text);
    console.log("sending", fd);
    fetch(to, {
        method: 'POST',
        body: fd
    }).then(response => response.status)
        .catch(error => console.error('Error:', error))
            .then(response => console.log('Success:', response));
}

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
                sendChat(from, space, message);
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
            console.log("got an exception on a pushed message", msgEvt, ex);
        }
    });

    port.start();
}

