const me = "nicferrier@localhost";
var chats = {};

window.consoleChats = function () {
    console.log("chats", chats);
}


function chatTimeFormat (time) {
    return time.toLocaleString();
}

const photos = {
    "nicferrier@localhost": "photos/nic.jpg",
    "rajesh.shah@localhost": "photos/raj.jpg",
    "dan.flower@localhost": "photos/dan.jpg",
    "audrey@localhost": "photos/audrey.jpg"
};

function getPhoto(from) {
    return photos[from];
}

function displayChatTime (chat, msgTime) {
    let spacer = document.createElement("div");
    spacer.setAttribute("date-datetime", msgTime.valueOf());
    spacer.setAttribute("date-datetime-string", msgTime.toString());
    spacer.classList.add("chat-time");
    spacer.textContent = chatTimeFormat(msgTime);
    chat.appendChild(document.importNode(spacer, true));
}

function displayMessage(msgTime, text, toSpace, from) {
    let chat = document.querySelector("section.chat");
    if (chat.children.length == 0) {
        displayChatTime(chat, msgTime);
    }
    else if (chat.children.length > 0) {
        let lastChild = chat.children[chat.children.length - 1];
        let lastDatetimeString = lastChild.getAttribute("data-datetime");
        let lastDatetimeLong = parseInt(lastDatetimeString);
        let hoursSince = (msgTime.valueOf() - lastDatetimeLong) / 1000 / 60 / 60;
        if (hoursSince > 1) {
            displayChatTime(chat, msgTime);
        }
    }
    
    let div = document.createElement("div");
    div.setAttribute("data-datetime", msgTime.valueOf());
    div.setAttribute("data-datetime-string", msgTime.toString());
    div.classList.add(from == me ? "me":"other");
    let img = document.createElement("img");
    let photoUrl = getPhoto(from);
    img.src = photoUrl;
    let span = document.createElement("span");
    span.textContent = text;
    if (from == me) {
        div.appendChild(span);
        div.appendChild(img);
    }
    else {
        div.appendChild(img);
        div.appendChild(span);
    }
    chat.appendChild(document.importNode(div, true));
    chat.scrollTop = chat.scrollHeight;
}

function queueMessage(msgTime, text, toSpace, from, workerPort) {
    let msg = {
        type: "to",
        message: text,
        space: document.location.href + "blah/msg",
        from: from
    };
    workerPort.postMessage([msg]);
    displayMessage(msgTime, text, toSpace, from, workerPort);
}

function displayChat(json) {
    let { name, messages } = json;
    let headerH2 = document.querySelectorAll(".chat-header h2");
    headerH2[0].textContent = name;
    messages.forEach(message => {
        let { datetime, text, from, to } = message;
        console.log("message", datetime, text);
        displayMessage(new Date(datetime), text, "unknown", from);
    });
    return json;
}

async function getChat(spaceName) {
    console.log("getChat", spaceName);
    return fetch(document.location.href + spaceName + "/msg")
        .then(response => response.json())
}

async function getChats() {
    let response = await fetch(document.location.href + "chats");
    let chats = await response.json();
    let myChatNames = Object.keys(chats);
    let chatsIndex = document.querySelector("section.index");
    let length = myChatNames.length;
    myChatNames.forEach(async function (chat, i) {
        let spaceName = chats[chat];
        console.log(spaceName, i);
        let json = await getChat(spaceName);
        let members = json.members;
        let membersNotMe = members.filter(member => member != me);
        let photos = membersNotMe.map(getPhoto)
        console.log("members", photos);
        let section = document.createElement("a");
        section.setAttribute("href", spaceName);
        section.setAttribute("tabindex", i);
        section.textContent = chat;
        let img = document.createElement("img");
        img.src = photos[0];
        section.appendChild(img);
        let element = document.importNode(section, true);
        element.addEventListener("click", function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            let spaceName = evt.currentTarget.getAttribute("href");
            getChat(spaceName).then(displayChat);
            return false;
        });
        chatsIndex.appendChild(element);
    });
}

window.addEventListener("load", evt => {
    let commsWorker = new SharedWorker("comms-worker.js");
    commsWorker.port.addEventListener("message", msgEvt => {
        console.log("worker message", msgEvt);
    });
    commsWorker.port.start();

    getChats();

    let msgInput = document.querySelector("textarea[name=chat]");
    msgInput.addEventListener("keypress", keyEvt => {
        if (keyEvt.code == "Enter") {
            queueMessage(new Date(), msgInput.value, "somechat", me, commsWorker.port);
            msgInput.value = "";
            keyEvt.preventDefault();
        }
    });
});

// index.js ends here
