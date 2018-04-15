const me = "nicferrier@localhost";


function chatTimeFormat (time) {
    return time.toLocaleString();
}

function queueMessage(msgTime, text, toSpace, workerPort) {
    let msg = {
        type: "to",
        message: text,
        space: document.location.href + "blah/msg",
        from: me
    };
    workerPort.postMessage([msg]);

    let chat = document.querySelector("section.chat");
    if (chat.children.length > 0) {
        let lastChild = chat.children[chat.children.length - 1];
        let lastDatetimeString = lastChild.getAttribute("data-datetime");
        let lastDatetimeLong = parseInt(lastDatetimeString);
        let hoursSince = (msgTime.valueOf() - lastDatetimeLong) / 1000 / 60 / 60;
        if (hoursSince > 1) {
            let spacer = document.createElement("div");
            spacer.setAttribute("date-datetime", msgTime.valueOf());
            spacer.setAttribute("date-datetime-string", msgTime.toString());
            spacer.classList.add("chat-time");
            spacer.textContent = chatTimeFormat(msgTime);
            chat.appendChild(document.importNode(spacer, true));
        }
    }
    
    let chatter = chat.querySelector("template");
    let div = chatter.content.querySelector("div");
    div.setAttribute("data-datetime", msgTime.valueOf());
    div.setAttribute("data-datetime-string", msgTime.toString());
    chatter.content.querySelector("span").textContent = text;
    chatter.content.querySelector("img").src = "photos/nic.jpg";
    chat.appendChild(document.importNode(chatter.content, true));
}

window.addEventListener("load", evt => {
    let commsWorker = new SharedWorker("comms-worker.js");

    commsWorker.port.addEventListener("message", msgEvt => {
        console.log("worker message", msgEvt);
    });

    commsWorker.port.start();

    let msgInput = document.querySelector("textarea[name=chat]");
    msgInput.addEventListener("keypress", keyEvt => {
        if (keyEvt.code == "Enter") {
            queueMessage(new Date(), msgInput.value, "somechat", commsWorker.port);
            msgInput.value = "";
            keyEvt.preventDefault();
        }
    });
});
