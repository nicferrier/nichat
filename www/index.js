const me = "nicferrier@localhost";
var chats = {};
var state = {};

Array.prototype.forEachAsync = async function (fn) {
    for (let t of this) { await fn(t) }
}

function timePad(number) {
    return ("" + number).padStart(2, "0");
}

function chatTimeFormat (time) {
    let now = new Date();
    let hours = (now.valueOf() - time.valueOf()) / 1000 / 60 / 60;
    let hour = time.getHours();
    let minutes = time.getMinutes();
    if (hours < 6) {
        return `${timePad(hour)}:${timePad(minutes)}`;
    }
    else if (hours < 72) {
        let days = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday"
        ];
        let day = time.getDay();
        return `${days[day]}, ${timePad(hour)}:${timePad(minutes)}`;
    }
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
    spacer.setAttribute("data-datetime", msgTime.valueOf());
    spacer.setAttribute("data-datetime-string", msgTime.toString());
    spacer.classList.add("chat-time");
    let span = document.createElement("span");
    span.textContent = chatTimeFormat(msgTime);
    spacer.appendChild(span);
    chat.appendChild(spacer);
}

function chatDiv(container) {
    let div = document.createElement("div");
    let divNode = document.importNode(div, true);
    container.appendChild(divNode);
    return divNode;
}

async function displayMessage(msgTime, text, toSpace, from) {
    // console.log("displayMessage text", text);
    let chat = document.querySelector("section.chat div");
    
    let div = document.createElement("div");
    div.setAttribute("data-datetime", msgTime.valueOf());
    div.setAttribute("data-datetime-string", msgTime.toString());
    div.classList.add(from == me ? "me":"other");
    let img = document.createElement("img");
    let photoUrl = await getUserPhoto(from);
    img.src = photoUrl;
    let chatDiv = document.createElement("div");
    let span = document.createElement("span");
    chatDiv.appendChild(span);

    if (chat.children.length == 0) {
        displayChatTime(chat, msgTime);
    }
    else if (chat.children.length > 0) {
        // console.log("displayMessage length", chat.children.length);
        let lastChild = chat.children[chat.children.length - 1];
        let lastDatetimeString = lastChild.getAttribute("data-datetime");
        // console.log("displayMessage lastDatetimeString", lastDatetimeString, text);
        let lastDatetimeLong = parseInt(lastDatetimeString);
        let hoursSince = (msgTime.valueOf() - lastDatetimeLong) / 1000 / 60 / 60;
        // console.log("displayMessage hoursSince", hoursSince);
        if (hoursSince > 1) {
            displayChatTime(chat, msgTime);
        }
    }
    
    span.textContent = text;
    if (from == me) {
        div.appendChild(img);
        div.appendChild(chatDiv);
    }
    else {
        div.appendChild(img);
        div.appendChild(chatDiv);
    }
    chat.appendChild(div);
    chat.parentNode.scrollTop = chat.parentNode.scrollHeight;
}

async function queueMessage(msgTime, text, toSpace, from, workerPort) {
    let msg = {
        type: "to",
        message: text,
        space: toSpace,
        from: from
    };
    console.log("queueMessage", msg);
    workerPort.postMessage([msg]);
    await displayMessage(msgTime, text, toSpace, from, workerPort);
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

    let contentEditable = document.querySelector(".entry div div");
    contentEditable.removeAttribute("disabled");
    contentEditable.setAttribute("contentEditable", "true");
    contentEditable.focus();

    messages.forEachAsync(async function (message) {
        let { datetime, text, from, to } = message;
        // console.log("message", datetime, text);
        await displayMessage(new Date(datetime), text, "unknown", from);
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

var speechOn = false;
const  incommingMessage = function (text) {
    if (speechOn) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
};

function initSpeech () {
    let voices = speechSynthesis.getVoices();
    let englishVoices = voices.filter(voice => voice.lang == "en-GB");
    new SpeechSynthesisUtterance().voice = englishVoices[1];
}

async function init (commsWorker) {
    let chats = await getChats();

    window.onpopstate = function (evt) {
        console.log("popstate", evt);
    };

    document.querySelector("button[name=faces]")
        .addEventListener("click", evt => {
            let emoticons = document.querySelector(".emoticons");
            emoticons.classList.toggle("hidden");
            emoticons.focus();
        });

    document.querySelector("button[name=settings]")
        .addEventListener("click", evt => {
            let settings = document.querySelector(".controls");
            settings.classList.toggle("hidden");
            settings.focus();
        });

    document.querySelector("button[name=speech]")
        .addEventListener("click", evt => {
            speechOn = !speechOn;
            let settings = document.querySelector(".controls");
            settings.classList.toggle("hidden");
            settings.focus();
        });

    let msgInput = document.querySelector("div[name=chat]");
    msgInput.addEventListener("keypress", keyEvt => {
        if (keyEvt.code == "Enter") {
            let now = new Date();
            let text = msgInput.textContent;
            msgInput.textContent = "";
            console.log("text to send", text);
            let spaceUrl = document.querySelector("body article")
                .getAttribute("data-url");
            queueMessage(now, text, spaceUrl, me, commsWorker.port);
            msgInput.value = "";
            keyEvt.preventDefault();
        }
    });
    msgInput.addEventListener("paste", evt => {
        console.log("paste event", evt);
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
            incommingMessage(text);
        }
        console.log("worker message", msgEvt, from, to, text);
    });
    commsWorker.port.start();

    init(commsWorker);
});

// index.js ends here
