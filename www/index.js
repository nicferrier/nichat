// Copyright (C) 2018 by Nic Ferrier

import hton from "./hton.js";

const config = {
    me: "",
    chats: {},
    state: {}
};

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
    let url = document.location.origin
        + "/" + document.location.pathname.split("/")[1]
        + "/people/"
        + username
        + "/photo";
    return url;
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
    console.log("displayMessage text", text);
    let chat = document.querySelector("section.chat div");
    
    let div = document.createElement("div");
    div.setAttribute("data-datetime", msgTime.valueOf());
    div.setAttribute("data-datetime-string", msgTime.toString());
    div.classList.add(from == config.me ? "me":"other");
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

    hton.hton2Dom(text, span);
    //span.textContent = text;
    if (from == config.me) {
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
    await displayMessage(msgTime, JSON.parse(text), toSpace, from, workerPort);
}

function displayChat(json) {
    console.log("displayChat called!");
    let article = document.querySelector("body article");
    article.classList.remove("empty");
    article.querySelector("div").classList.remove("hidden");
    
    let { url, name, messages } = json;
    history.pushState(config.state, name, url);
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

    if (messages !== undefined) {
        messages.forEachAsync(async function (message) {
            let { datetime, text, from, to } = message;
            // console.log("message", datetime, text);
            await displayMessage(new Date(datetime), text, "unknown", from);
        });
    }
    return json;
}

async function getChat(spaceNameUrl) {
    let chatJsonUrl = spaceNameUrl + "?json=1";
    console.log("getChat", chatJsonUrl);
    let response = await fetch(chatJsonUrl);
    console.log("getChat response", response);
    let jsonData = await response.json();
    jsonData["url"] = spaceNameUrl;
    console.log("getChat jsonData", jsonData, jsonData.messages);
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
    let response = await fetch(getChatListUrl(), { credentials: "same-origin" });
    console.log("getChats response", response);
    let myChats = await response.json();
    console.log("getChats response json", myChats);
    config.chats = myChats;
    let myChatList = Object.keys(myChats);
    // console.log("getChats myChatNames", myChatList);
    let chatsIndex = document.querySelector("section.index div.chats");
    let length = myChatList.length;
    myChatList.forEachAsync(async function (chat, i) {
        // console.log("chat", i, chat);
        let { spaceName, members } = myChats[chat];
        config.chats[chat].loaded = false;
        let spaceNameUrl = getSpaceNameUrl(spaceName);
        let chatCfg = { chat: spaceName, url: spaceNameUrl, tabIndex: i};
        //  console.log("getChats chatCfg", chatCfg);
        let membersNotMe = members.filter(member => member != config.me);
        let photos = await Promise.all(membersNotMe.map(getUserPhoto))
        console.log("getChats members", photos);
        let section = document.createElement("a");
        section.setAttribute("href", getSpaceNameUrl(spaceName));
        section.setAttribute("data-chatname", chat);
        section.setAttribute("tabindex", i + 1);
        section.textContent = membersNotMe.join(",");
        let img = document.createElement("img");
        img.src = photos[0];
        section.appendChild(img);
        let element = document.importNode(section, true);
        element.addEventListener("click", evt => {
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

function getPeopleListUrl() {
    let url = document.location.origin
        + "/"
        + document.location.pathname.split("/")[1]
        + "/people";
    return url;
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
    console.log("getChatNameOrEmpty url", url, document.location.pathname);
    let [ _, chat, resource, name ] = url;
    if (resource == "chat") {
        return [name];
    }
    return [];
}

function pasteHandler (e) {
    console.log("pasteHandler!", e);
    let items = e.clipboardData.items;
    Array.from(items).forEachAsync(async function (item, i) {
	if (item.type.indexOf("image") >= 0) {
	    let itemFile = item.getAsFile();
	    let formData = new FormData();
	    formData.append("image", itemFile);

            let url = document.location.href + ";imageUpload";
            console.log("image upload url", url);
            let response = await fetch(url, {
                method: "POST",
                body: formData
            });

            let location = response.headers.get("Location");
            document.execCommand("insertImage", false, location);
	}
	else {
	    console.log("Ignoring non-image.");
	}
    });
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

function clickToFullView(target) {
    if (target != null) {
        if (target.classList.contains("me")
            || target.classList.contains("other")) {
            let targetContent = target.cloneNode(true);
            let displayContainer = document.querySelector(".fullview");
            document.querySelector(".fullview article").remove();
            let newArticle = document.createElement("article");
            newArticle.appendChild(targetContent);
            displayContainer.appendChild(newArticle);
            displayContainer.classList.remove("hidden");
            document.querySelector(".fullview button").focus();
        }
        else {
            clickToFullView(target.parentElement);
        }
    }
}

// Fill in all the chat people
async function getChatPeople(pattern) {
    console.log("getChatPeople pattern", pattern);
    let list = document.querySelector("#peoplelist");
    list.classList.remove("hidden");

    let patternFilter = pattern == ""
        ? person => true : person => person.name.startsWith(pattern);
    let response = await fetch(getPeopleListUrl());
    let chatPeople = await response.json();
    Array.from(list.children).forEach(node => {
        list.removeChild(node)
    });

    chatPeople
        .filter(patternFilter)
        .forEach(person => {
            let { id, name, } = person;
            let li = document.createElement("li");
            let a = document.createElement("a");

            // make an id for the chat?
            let people = name + "," + config.me;
            a.setAttribute("href", "/nichat/chat/");
            a.setAttribute("data-invite", people);
            let img = document.createElement("img");
            img.setAttribute("src", "/nichat/people/" + name + "/photo");
            a.appendChild(img);

            a.addEventListener("click", async evt => {
                evt.preventDefault();
                evt.stopPropagation();

                let url = evt.target.getAttribute("href");
                let fd = new FormData();
                let invitees = people.split(",");
                invitees.forEach(invitee => fd.append("invite", invitee));
                let response = await fetch("/nichat/chat/", {
                    method: "POST",
                    body: fd
                });
                let chatLocation = response.headers.get("location");
                console.log("response", response, chatLocation);

                Array.from(list.children).forEach(node => {
                    list.removeChild(node)
                });
                
                let chatUrl = getSpaceNameUrl(chatLocation);
                console.log("chatUrl", chatUrl);
                //getAndDisplayChat(chatUrl);  -- think the UI just does this because redirect
            });

            // FIXME add esc handler to get rid of people list?

            let text = document.createElement("span");
            text.textContent = name;
            a.appendChild(text);

            li.appendChild(a);
            list.appendChild(li);
        });
}

async function getSessionUser () {
    let chatUserUrl = "/nichat/chat-user"
    let chatUserResponse = await fetch(chatUserUrl, { credentials: "same-origin"});
    console.log("chat user response", chatUserResponse.status);
    if (chatUserResponse.status == 404) {
        let authGenerateUrl = "/nichat/welcome/chat-authenticate";
        let authGenerateResponse = await fetch(authGenerateUrl, {
            credentials: "same-origin",
            method: "POST"
        });
        let chatAuth = authGenerateResponse.headers.get("x-nichat-chatauth");
        chatUserResponse = await fetch(chatUserUrl, {
            credentials: "same-origin",
            method: "POST",
            headers: {
                "x-nichat-chatauth": chatAuth,
            }
        });
    }
    let nichatUser = chatUserResponse.headers.get("x-nichat-user");
    document.querySelector(".control img").setAttribute("title", nichatUser);
    return nichatUser;
}

async function init (commsWorker) {
    config.me = await getSessionUser();

    let chats = await getChats();

    window.onpopstate = function (evt) {
        console.log("popstate", evt);
    };

    let search = document.querySelector("input[name=search]");
    search.addEventListener("focusin", async evt => {
        await getChatPeople(search.value);
    });
    search.addEventListener("keyup", async evt => {
        await getChatPeople(search.value);
    });

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
            let text = hton.htonStringify(msgInput);
            console.log("msgInput text", text);
            let spaceUrl = document
                .querySelector("body > article > div")
                .getAttribute("data-url");
            console.log("spaceUrl is", spaceUrl);
            queueMessage(now, text, spaceUrl, config.me, commsWorker.port);

            msgInput.textContent = "";
            keyEvt.preventDefault();
        }
    });
    msgInput.addEventListener("paste", evt => {
        pasteHandler(evt);
    });

    let chatNameOrEmpty = getChatNameOrEmpty();
    console.log("init chatNameOrEmpty", chatNameOrEmpty);
    if (chatNameOrEmpty instanceof Array
       && chatNameOrEmpty.length > 0) {
        let chatUrl = document.location.href;
        console.log("init chatNameOrEmpty chatUrl", chatUrl);
        getAndDisplayChat(chatUrl);
    }

    document.querySelector("div.fullview button")
        .addEventListener("click", evt => {
            if (!evt.target.parentElement.classList.contains("hidden")) {
                evt.target.parentElement.classList.add("hidden");
            }
        });

    // Click handler for making the wide view of a chat message
    window.addEventListener("click", evt => {
        let target = evt.target;
        let chatPanel = document.querySelector("body article");
        let doesContain = chatPanel.contains(target);
        console.log("click event", doesContain, evt);

        if (doesContain) {
            clickToFullView(target);
        }
    });
}

window.addEventListener("load", evt => {
    let workerUrl = getAssetsUrl("comms-worker.js");
    let commsWorker = new SharedWorker(workerUrl);
    commsWorker.port.addEventListener("message", msgEvt => {
        let data = msgEvt.data;
        console.log("worker data", data);
        let object = JSON.parse(data);
        let currentChatUrl = document
            .querySelector("body article")
            .getAttribute("data-url");
        let { from, to, text } = object;
        if (from != config.me && to == currentChatUrl) {
            displayMessage(new Date(), text, to, from);
            incommingMessage(text);
        }
        console.log("worker message", msgEvt, from, to, text);
    });
    commsWorker.port.start();

    init(commsWorker);
});

// index.js ends here
