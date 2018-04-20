const me = "nicferrier@localhost";
var chats = {};
var state = {};

window.consoleChats = function () {
    console.log("chats", chats);
}

window.consoleState = function () {
    console.log("state", state);
}

function chatTimeFormat (time) {
    return time.toLocaleString();
}

var photosList = {}

async function getUserPhoto(username)
{
    if (photosList[username] === undefined) {
        console.log("photo trying to retrieve for", username);
        let url = document.location.origin
            + "/" + document.location.pathname.split("/")[1]
            + "/people/"
            + username;
        console.log("photo", url);
        let response = await fetch(url);
        let json = await response.json();
        let { photo } = await json;
        photosList[username] = photo;
        return photo;
    }
    else {
        return photosList[username];
    }
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

async function displayMessage(msgTime, text, toSpace, from) {
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
    let photoUrl = await getUserPhoto(from);
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
    console.log("queueMessage", msg);
    workerPort.postMessage([msg]);
    displayMessage(msgTime, text, toSpace, from, workerPort);
}

function displayChat(json) {
    let { url, name, messages } = json;
    history.pushState(state, name, url);
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

async function getChat(spaceNameUrl) {
    let chatJsonUrl = spaceNameUrl + "?json=1";
    console.log("getChat", chatJsonUrl);
    let response = await fetch(chatJsonUrl);
    console.log("getChat response", response);
    let jsonData = await response.json();
    jsonData["url"] = spaceNameUrl;
    console.log("getChat jsonData", jsonData);
    return jsonData;
}

function getSpaceNameUrl(name) {
    let url = document.location.origin
        + "/"
        + document.location.pathname.split("/")[1]
        + "/chat/"
        + name;
    console.log("getSpaceNameUrl", url);
    return url;
}

function getChatListUrl() {
    let url = document.location.origin
        + "/"
        + document.location.pathname.split("/")[1]
        + "/chats";
    return url;
}

async function getAndDisplayChat(url) {
    let chatJson = await getChat(url);
    displayChat(chatJson);
}

async function getChats() {
    let response = await fetch(getChatListUrl());
    let myChats = await response.json();
    chats = myChats;
    let myChatNames = Object.keys(myChats);
    console.log("getChats myChatNames", myChatNames);
    let chatsIndex = document.querySelector("section.index");
    let length = myChatNames.length;
    myChatNames.forEach(async function (chat, i) {
        // console.log("chat", i, chat);
        let spaceName = myChats[chat].spaceName;
        chats[chat].loaded = false;
        let spaceNameUrl = getSpaceNameUrl(spaceName);
        console.log("getChats getChat", spaceName, "url", spaceNameUrl, "tabindex", i);
        let json = await getChat(spaceNameUrl);
        let members = json.members;
        let membersNotMe = members.filter(member => member != me);
        let photos = await Promise.all(membersNotMe.map(getUserPhoto))
        // console.log("members", photos);
        let section = document.createElement("a");
        section.setAttribute("href", getSpaceNameUrl(spaceName));
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
            let spaceUrl = evt.currentTarget.getAttribute("href");
            // getChat(spaceUrl).then(displayChat);
            getAndDisplayChat(spaceUrl);
            return false;
        });
        chatsIndex.appendChild(element);
    });
    return myChats;
}

function getAssetsUrl(asset) {
    let url = document.location.origin
        + "/"
        + document.location.pathname.split("/")[1]
        + "/"
        + asset;
    console.log("asset", url);
    return url;
}

function getChatNameOrEmpty() {
    let url = document.location.pathname.split("/");
    let [ _, chat, resource, name ] = url;
    if (resource == "chat") {
        return name;
    }
    return [];
}

async function init (commsWorker) {
    let chats = await getChats();
    
    window.onpopstate = function (evt) {
        console.log("popstate", evt);
    };

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

    let chatNameOrEmpty = getChatNameOrEmpty();
    console.log("chatNameOrEmpty", chatNameOrEmpty);
    if (chatNameOrEmpty != []) {
        let chatUrl = document.location.href;
        console.log("chatNameOrEmpty chatUrl", chatUrl);
        getAndDisplayChat(chatUrl);
    }
}

window.addEventListener("load", evt => {
    let workerUrl = getAssetsUrl("comms-worker.js");
    let commsWorker = new SharedWorker(workerUrl);
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

    init(commsWorker);
});

// index.js ends here
