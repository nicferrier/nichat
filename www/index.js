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

function chatDiv(container) {
    let div = document.createElement("div");
    let divNode = document.importNode(div, true);
    container.appendChild(divNode);
    return divNode;
}

function displayMessage(msgTime, text, toSpace, from) {
    let chat = document.querySelector("section.chat div");
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
    chat.parentNode.scrollTop = chat.parentNode.scrollHeight;
}

function queueMessage(msgTime, text, toSpace, from, workerPort) {
    let msg = {
        type: "to",
        message: text,
        space: toSpace,
        from: from
    };
    workerPort.postMessage([msg]);
    displayMessage(msgTime, text, toSpace, from, workerPort);
}

function displayChat(json) {
    let { url, name, messages } = json;
    document.querySelector(".chat-header")
        .parentNode
        .setAttribute("data-url", url);
    let headerH2 = document.querySelectorAll(".chat-header h2");
    headerH2[0].textContent = name;
    let div = document.querySelector(".chat div");
    if (div != null) {
        console.log("div", div);
        div.parentNode.removeChild(div);
    }
    div = document.importNode(document.createElement("div"));
    document.querySelector(".chat").appendChild(div);
    document.querySelector(".entry div textarea").removeAttribute("disabled");
    messages.forEach(message => {
        let { datetime, text, from, to } = message;
        console.log("message", datetime, text);
        displayMessage(new Date(datetime), text, "unknown", from);
    });
    return json;
}

async function getChat(spaceName) {
    console.log("getChat", spaceName);
    let url = document.location.href + spaceName + "/msg";
    let jsonData = await fetch(url).then(response => response.json());
    jsonData["url"] = url;
    console.log("jsonData", jsonData);
    return jsonData;
}

async function getChats() {
    let response = await fetch(document.location.href + "chats");
    let myChats = await response.json();
    chats = myChats;
    let myChatNames = Object.keys(myChats);
    let chatsIndex = document.querySelector("section.index");
    let length = myChatNames.length;
    myChatNames.forEach(async function (chat, i) {
        let spaceName = myChats[chat].spaceName;
        chats[chat].loaded = false;
        console.log(spaceName, "tabindex", i);
        let json = await getChat(spaceName);
        let members = json.members;
        let membersNotMe = members.filter(member => member != me);
        let photos = membersNotMe.map(getPhoto)
        console.log("members", photos);
        let section = document.createElement("a");
        section.setAttribute("href", spaceName);
        section.setAttribute("data-chatname", chat);
        section.setAttribute("tabindex", i + 1);
        section.textContent = chat;
        let img = document.createElement("img");
        img.src = photos[0];
        section.appendChild(img);
        let element = document.importNode(section, true);
        element.addEventListener("click", function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
            let chatName = evt.currentTarget.getAttribute("data-chatname");
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
        let data = msgEvt.data;
        let object = JSON.parse(data);
        let currentChatUrl = document.querySelector("body article")
            .getAttribute("data-url");
        let { from, to, text } = object;
        if (from != me && to == currentChatUrl) {
            displayMessage(new Date(), text, to, from);
        }
        console.log("worker message", msgEvt, from, to, text);
    });
    commsWorker.port.start();

    getChats();

    let msgInput = document.querySelector("textarea[name=chat]");
    msgInput.addEventListener("keypress", keyEvt => {
        if (keyEvt.code == "Enter") {
            let now = new Date();
            let text = msgInput.value;
            let spaceUrl = document.querySelector("body article")
                .getAttribute("data-url");
            queueMessage(now, text, spaceUrl, me, commsWorker.port);
            msgInput.value = "";
            keyEvt.preventDefault();
        }
    });
});

// index.js ends here
