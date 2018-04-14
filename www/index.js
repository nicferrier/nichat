const me = "nicferrier@localhost";

function queueMessage(text, toSpace, workerPort) {
    let chat = document.querySelector("section.chat");
    let chatter = chat.querySelector("template");
    chatter.content.querySelector("span").textContent = text;
    chatter.content.querySelector("img").src = "photos/nic.jpg";
    chat.appendChild(document.importNode(chatter.content, true));
    let msg = {type: "to", message: text, space: toSpace, from: me };
    workerPort.postMessage([msg]);
}

window.addEventListener("load", evt => {
    let commsWorker = new SharedWorker("comms-worker.js");

    commsWorker.port.addEventListener("message", msgEvt => {
        console.log("worker message", msgEvt);
    });

    commsWorker.port.start();

    let msgInput = document.querySelector("input[name=chat]");
    msgInput.addEventListener("keypress", keyEvt => {
        if (keyEvt.code == "Enter") {
            queueMessage(msgInput.value, "somechat", commsWorker.port);
            msgInput.value = "";
        }
    });
});
