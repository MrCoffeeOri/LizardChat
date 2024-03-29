import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

const searchParams = new URLSearchParams(window.location.search)
const authToken = searchParams.get('authToken')
const socket = io(window.location.host, { auth: { token: authToken, userID: searchParams.get('userID') } })
const notificationAudio = new Audio("../assets/notificationSound.mp3")
const messageView = document.getElementById("messages-view")
const messageInp = document.querySelector(`#messageInput > input[type="text"]`)
const searchInput = document.querySelector("#search > div > input")
const searchInputBack = document.querySelector("#search > div > svg")
const fileSelec = document.querySelectorAll("#messageInput > svg")[0]
const messageFileInp = document.getElementById("fileInp")
const groupFileInp = document.getElementById("fileGroupInput")
const loadingIntro = document.getElementById("loading-intro")
const chatInfo = document.getElementById("chat-info")
const groupImageDisplay = document.getElementById("groupImageDisplay")
const inviteNotification = document.getElementById("invites-notification")
const fileSC = document.getElementById("file-showcase")
const chatMoreInfo = document.getElementById("chat-moreInfo")
const loadingInterval = setInterval(() => loadingIntro.children[2].innerHTML = loadingIntro.children[2].innerHTML.includes('...') ? "Connecting." : loadingIntro.children[2].innerHTML + ".", 950)
const parseMessageContent = (content, limit = true) => (content.length > 200 && limit ? content.slice(0, 200) + '...' : content)
    .replaceAll(/<|>/g, char => char == '<' ? "&lt;" : "&gt;")
    .replaceAll(/\((\^|\$|\_)[^\^\$\_\(\)]+\S\)/g, word => `<span style="${word[1] == '^' ? "font-size: 1.3pc;" : `text-decoration: ${word[1] == '$' ? "line-through" : word[1] == '_' ? "underline": "none"};`}">${word.slice(2, word.length - 1)}</span>`)
    .replaceAll(/(https?:\/\/[^\s\<\>]+)/g, url => url.match(/(\.png|\.webp|\.gif|\.jpg|\.jpeg)\b/g) ? `<img src="${url}"/>` : url.match(/youtube\.com\/watch\?v=[^\s]+/g) ? `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${url.split('=')[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : `<a href="${url}" target="_blank">${url}</a>`)
const parseChatMessageDisplay = message => `${(message.content.name || message.content).slice(0, 10) + ((message.content.name || message.content).length > 10 ? '...' : '')} ${new Date(message.date).toLocaleTimeString()}`
let selectedChat = null, user = null

if (searchParams.get('firstTime')) {
    const toggleWelcome = () => {
        document.getElementById("intro-modal").classList.toggle("hidden")
        document.getElementById("background").classList.toggle("hidden")
    }
    toggleWelcome()
    const colseTime = setTimeout(() => toggleWelcome(), 3100)
    document.getElementById("background").onclick = () => {
        toggleWelcome()
        clearTimeout(colseTime)
    }
}

notificationAudio.volume = 0.70
document.querySelectorAll("#messageInput > svg")[1].addEventListener('click', async () => await SendMessageHandle())
document.querySelectorAll("dialog").forEach(dialog => dialog.addEventListener("click", e => e.target.tagName == "DIALOG" && e.target.close()))
messageInp.addEventListener("keydown", async e => e.key == "Enter" && await SendMessageHandle())
fileSelec.addEventListener('click', () => !fileSC.hasAttribute("file") && messageFileInp.click())
fileSC.children[3].addEventListener("click", () => messageFileInp.click())
groupImageDisplay.addEventListener("click", () => groupFileInp.click())
chatInfo.children[1].children[1].addEventListener("mouseleave", e => e.target.innerText = "See more information")
chatMoreInfo.lastElementChild.addEventListener("click", () => chatMoreInfo.style.display = "none")

chatInfo.children[1].children[1].addEventListener("mouseenter", e => {
    if (user.chats[selectedChat].owner) {
        const usersParsed = user.chats[selectedChat].users.map(_user => _user.uid == user.uid ? "You" : _user.name).join(', ')
        e.target.innerText = usersParsed ? usersParsed.slice(0, 50) + (usersParsed.length > 50 ? '...' : '') : ""
    }
})

chatInfo.children[1].children[1].addEventListener("click", () => {
    chatMoreInfo.style.display = "flex"
    chatMoreInfo.children[0].src = "./api/upload/" + user.chats[selectedChat].image
    chatMoreInfo.children[1].innerText = user.chats[selectedChat].name
    chatMoreInfo.children[2].innerText = user.chats[selectedChat].users.length + " participant" + (user.chats[selectedChat].users.length > 1 ? "s" : "")
    chatMoreInfo.children[3].innerHTML = parseMessageContent(user.chats[selectedChat].description, false).replaceAll("\n", () => "<br/>")
    RenderElements("users-showcase", chatUser => `
        <div style="display: inherit">        
            <img src="./api/upload/${chatUser.image}"/>
            <h3>${chatUser.uid == user.uid ? "You" : chatUser.name + '@' + chatUser.uid}</h3>
            ${user.chats[selectedChat].owner == chatUser.uid ? "<span class='tag'>owner</span>" : ""}
        </div>
        ${chatUser.uid != user.uid ? '<svg class="hidden" viewID="userInChat" viewBox="0 0 19 20" width="19" height="20" class=""><path fill="currentColor" d="m3.8 6.7 5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.2-7.3-7.2 1.6-1.6z"></path></svg>' : ""}
    `, true, false, (chatUser, e) => {
        if (e.target.tagName == "svg" || e.target.tagName == "path") {
            const menu = document.getElementById("userInChat-view")
            menu.style.top = e.y + "px"
            menu.style.left = e.x - 70 + "px"
        } else if (chatUser.uid != user.uid) {
            socket.emit("dm", { action: "create", userUID: user.uid })
            chatMoreInfo.lastElementChild.click()
        }
    }, () => ["user-inchat", "flex-set"], ...user.chats[selectedChat].users)
})


fileSC.children[0].addEventListener("click", () => {
    ToggleFile()
    messageInp.value = ''
    messageInp.removeAttribute("messageToEditID")
})

window.addEventListener("click", e => {
    document.querySelectorAll(".selection").forEach(other => e.target.getAttribute("viewid") + "-view" != other.id && other?.classList.add("hidden"))
    document.getElementById(`${e.target.getAttribute("viewid") || e.target.closest(`*[viewid]`)?.getAttribute("viewid")}-view`)?.classList.toggle("hidden")
})

document.querySelectorAll(".fileIn").forEach(fileInp => fileInp.addEventListener("input", e => {
    const reader = new FileReader()
    reader.onloadend = _e => { document.getElementById("newGroup-modal").open ? ToggleGroupImageDisplay(_e.target.result) : ToggleFile({ name: e.target.files[0].name, url: _e.target.result, size: e.target.files[0].size }) }
    reader.readAsDataURL(e.target.files[0])
}))

document.querySelectorAll("#options-view li").forEach(li => li.addEventListener('click', e => {
    if (e.target.id == "sendInvite") {
        const selection = document.getElementById("groupToInvite")
        selection.innerHTML = null
        user.chats.forEach(chat => {
            if (chat?.owner == user.uid) {
                selection.appendChild(document.createElement("option"))
                selection.lastChild.value = chat._id
                selection.lastChild.innerHTML = chat.name
            }
        })
        selection.disabled = selection.children.length == 0
        selection.innerHTML = selection.children.length == 0 ? "<option value=''>No groups to invite</option>" : selection.innerHTML
    }
    document.getElementById(`${e.target.id || e.target.parentElement.id}-modal`).showModal()
}))

document.getElementById("invites").addEventListener('click', e => {
    inviteNotification.classList.add("hidden")
    inviteNotification.innerText = null
    document.getElementById(`${e.target.id || e.target.parentElement.id}-modal`).showModal()
    RenderInvites(true, ...user.invites)
})

searchInput.addEventListener('input', e => {
    if (user.chats.length == 0) 
        document.getElementById("data-view").innerHTML = ''
    else if (e.target.value.length <= 0) 
        RenderChats(true, false, ...user.chats)
    searchInputBack.style.display = e.target.value.length > 0 ? "block" : "none"
})

searchInputBack.addEventListener('click', () => {
    searchInput.value = ""
    searchInput.dispatchEvent(new Event("input"))
})

searchInput.addEventListener('keydown', async e => {
    if (e.key == "Enter" && e.target.getAttribute("filter")) {
        document.getElementById("data-view").innerHTML = `<h3 style="text-align: center;">Loading ${e.target.getAttribute("filter").toLowerCase()} query...</h3>`
        const query = (await (await fetch(`/api/query/${e.target.getAttribute("filter").toLowerCase()}/${e.target.value}/20`)).json())?.query?.filter(rd => rd.uid != user.uid && !user.chats.some(chat => chat.uid == rd.uid))
        if (!query || !query.length) 
            return document.getElementById("data-view").innerHTML = `<h3 style="text-align: center;">Query data not found</h3>`
            
        RenderElements("data-view", queryData => `<p style="text-align: center;" class="search-user">${queryData.name}${'@'+queryData.uid}</p>`, true, false, queryData => {
            const queryDataViewElement = document.getElementById("queryData-view")
            const closeView = () => {
                queryDataViewElement.style.width = 0
                queryDataViewElement.innerHTML = null
            }
            queryDataViewElement.style.width = "68.15%"
            queryDataViewElement.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="50" height="35" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
                <h1>${queryData.name}${'@'+queryData.uid}</h1>
                <button>${queryData.inviteToken ? "Join" : "Send message"}</button>
            `
            queryDataViewElement.children[0].onclick = closeView
            queryDataViewElement.children[2].onclick = () => {
                searchInputBack.dispatchEvent(new Event("click"))
                socket.emit(queryData.owner ? "group" : "dm", queryData.owner ? { action: "join", token: queryData.inviteToken, uid: queryData.uid } : { action: "create", userUID: queryData.uid })
                closeView()
            }
        }, () => ["data-element"], ...query)
    } else if (e.key == "Enter") ShowInfoCard("Enter a search query")
})

document.querySelectorAll("#filter-view > li").forEach(li => li.addEventListener('click', (e) => {
    document.querySelector(`#filter-view > li.selected`)?.classList.remove("selected")
    document.querySelector(`#filter-view`).classList.toggle("hidden")
    e.target.classList.add("selected")
    searchInput.placeholder = 'Search using filter: ' + e.target.id
    searchInput.setAttribute('filter', e.target.id)
}))

document.getElementById("newGroupForm").addEventListener('submit', async e => {
    RenderElements("data-view", () => "Creating chat...", false, true, null, () => ["chat", "flex-set", "data-element"], { _id: "pseudochat" })
    socket.emit('group', { name: e.target[0].value, description: e.target[1].value, image: await UploadFile(e.target[2].getAttribute("file"), ".webp"), action: "create" })
    e.target[0].value = ""
    e.target[1].value = ""
    e.target.children[3].style = ""
    ToggleGroupImageDisplay()
})

messageView.addEventListener('scroll', async e => {
    if (e.target.scrollTop == 0 && user.chats[selectedChat] && user.chats[selectedChat].remainingMessages) {
        const data = (await (await fetch(`/api/chat/${user.chats[selectedChat]._id}/messages/?amount=10&limit=${user.chats[selectedChat].messages.length}&userUID=${user.uid}&userAuthToken=${authToken}&isDM=${user.chats[selectedChat].owner}`)).json())
        user.chats[selectedChat].remainingMessages = data.remaining
        messageView.scrollBy(0, document.getElementById(user.chats[selectedChat].messages[0].id).offsetTop)
        user.chats[selectedChat].messages.unshift(...data.messages)
        for (let i = 0; i < data.messages.length; i++) {
            RenderMessages(false, true, false, data.messages[data.messages.length - i - 1])
            data.messages[i].from.id != user.uid && !data.messages[i].views.some(view => view == user.uid) && socket.emit("message", { groupID: user.chats[selectedChat]._id, id: data.messages[i].id, action: "view" })
        }
    }
})

document.getElementById("sendInviteForm").addEventListener('submit', e => {
    if (e.target[1].disabled) return
    socket.emit('invite', { to: e.target[0].value, chatID: e.target[1].value, action: "create" })
    e.target[0].value = ''
    e.target[1].value = ''
})

socket.on("connect", () => {
    socket.recovered && ShowInfoCard("Reconnected", 5000, "var(--second-darken-color-theme)")
    socket.on("user", response => {
        if (!user) {
            const info = document.getElementById("info")
            user = response
            user.chats.sort((a, b) => {
                if (!a.messages[a.messages.length - 1]) return 0
                if (!b.messages[b.messages.length - 1]) return -1
                return new Date(b.messages[b.messages.length - 1].date) - new Date(a.messages[a.messages.length - 1].date)
            })
            user.chats.forEach(chat => {
                RenderChats(false, false, chat)
                ToggleNotification(chat)
            })
            info.children[0].src =  `./api/upload/${user.image}`
            info.children[1].innerText = `${user.name}@${user.uid}`
            clearInterval(loadingInterval)
            loadingIntro.remove()
        }
    })

    socket.on("invite", response => {
        switch (response.action) {
            case "recived":
                notificationAudio.play()
                user.invites.push(response.invite)
                if (!document.getElementById("invites-modal").classList.contains("hidden")) return RenderInvites(false, response.invite)
                inviteNotification.classList.remove("hidden")
                inviteNotification.innerText = user.invites.length
                break;

            case "handled":
                response.chat && AddChat(response.chat, false, true)
                user.invites = user.invites.filter(invite => invite.id != response.inviteID)
                document.getElementById(response.inviteID)?.remove()
                break;
        }
    })

    socket.on("userInChat", async response => {
        if (response.action == "join")
            response.id == user.chats[selectedChat]?._id ? user.chats[selectedChat].users.push(response.user) : user.chats.find(chat => chat._id == response.id).users.push(response.user)
        else {
            if (response.id == user.chats[selectedChat]?._id)
                user.chats[selectedChat].users.splice(user.chats[selectedChat].users.findIndex(user => user.uid == response.userUID), 1)
            else {
                const chat = user.chats.find(chat => chat._id == response.id)
                chat.users.splice(chat.users.findIndex(user => user.uid == response.userUID), 1)
            }
        }  
    })

    socket.on("message", response => {
        const chat = user.chats.find(chat => chat._id == response.chatID)
        switch (response.action) {
            case "send":
                document.getElementById(chat._id).remove()
                RenderChats(false, true, chat)
                chat.messages.push(response.message)
                document.getElementById(chat._id).children[3].innerText = parseChatMessageDisplay(response.message)
                if (selectedChat == null || user.chats[selectedChat]._id != response.chatID) {
                    notificationAudio.play()
                    if (!chat.newMessages) chat.newMessages = 0
                    chat.newMessages++
                    return ToggleNotification(chat, true)
                }
                if (response.message.from.uid != user.uid) {
                    socket.emit("message", { chatID: user.chats[selectedChat]._id, id: response.message.id, chatType: chat.owner ? "group" : "dm", action: "view" }) 
                    RenderMessages(false, false, true, response.message)
                } else document.getElementById(response.message.id).lastElementChild.style.backgroundColor = "var(--view-message-color)"
                break;
        
            case "edit":
                chat.messages[chat.messages.findIndex(message => message.id == response.message.id)].content = response.message.content
                if (chat.messages[chat.messages.length - 1].id == response.message.id && chat.messages[chat.messages.length - 1].contentType == "text") 
                    document.getElementById(chat._id).children[3].innerText = parseChatMessageDisplay(response.message)
                if (user.chats[selectedChat]?._id == response.chatID) 
                    document.getElementById(response.message.id).children[0].innerHTML = response.message.contentType == "text" ? parseMessageContent(response.message.content, false) :  (response.message.content.url.includes("image") ? `<img src="${response.message.content.url}" alt="${response.message.content.name}"/>` : `<div class="file"><span>${response.message.content.name}</span> <a style="width: 2vw; height: 4vh;" download="${response.message.content.name}" href="${response.message.content.url}"><svg style="width: 100%" viewBox="0 0 24 24" class=""><path d="M19.473 12.2h-4.3V2.9c0-.5-.4-.9-.9-.9h-4.3c-.5 0-.9.4-.9.9v9.3h-4.3c-.8 0-1 .5-.5 1.1l6.8 7.3c.7.9 1.4.7 2.1 0l6.8-7.3c.5-.6.3-1.1-.5-1.1Z" fill="currentColor"></path></svg></a></div>`) + `<p style="margin-top: 1%;">${parseMessageContent(response.message.content.description)}</p>`;
                break;

            case "delete":
                if (chat.messages[chat.messages.length - 1].id == response.message.id)
                    document.getElementById(chat._id).children[3].innerText = chat.messages[chat.messages.length - 2] ? parseChatMessageDisplay(chat.messages[chat.messages.length - 2]) : null;
                if (user.chats[selectedChat]?._id == response.chatID) 
                    document.getElementById(response.message.id).remove();
                chat.messages.splice(chat.messages.findIndex(message => message.id == response.message.id), 1)
                break;

            case "view":
                const messageIndex = chat.messages.findIndex(message => message.id == response.message.id)
                chat.messages[messageIndex].views.push(response.message.userUID)
                if (chat.messages[messageIndex].from.uid == user.uid) document.getElementById(response.message.id).lastElementChild.previousElementSibling.style.backgroundColor = "var(--view-message-color)"
                break;
        }
        user.chats[selectedChat] = response.chatID == user.chats[selectedChat]?._id ? chat : user.chats[selectedChat]
    })

    socket.on("error", response => {
        if (response.error == "Invalid authentication") {
            window.location.href = "/"
            localStorage.clear()
        }
        ShowInfoCard(response.error || "Unknow error")
    })

    socket.on("chat", response => {
        switch (response.action) {
            case "create":
            case "join":
                document.getElementById("pseudochat")?.remove()
                AddChat(response.chat, false, true)
                break;
    
            case "leave":
            case "delete":
                document.getElementById(response.id).remove()
                if (user.chats[selectedChat]?._id == response.id) {
                    selectedChat = null
                    messageView.innerHTML = ''
                    messageView.style.display = "none"
                    document.getElementById("messageInput").style.display = "none"
                    chatInfo.classList.add("hidden")
                    document.getElementById("messages-placeholder").classList.remove("hidden")
                }
                user.chats.splice(user.chats[selectedChat]?._id == response.id ? selectedChat : user.chats.findIndex(chat => chat._id == response.id), 1)
                break;
    
            case "rename":
                // TODO: Change the UID param and fix this shit
                user.chats.find(group => group.id == response.id).name = response.name
                if (user.chats[selectedChat].uid == response.id) {
                    user.chats[selectedChat].name = response.name
                    document.getElementById(response.id).children[0].innerText = response.name
                }
                break;
        }
    })

    socket.on("disconnect", () => ShowInfoCard("Connection Offline", 6000))
})

function ShowInfoCard(message, time = 3500, color = "var(--error-card-color)") {
    RenderElements("main-view", message => `<div class="flex-set"><img src="./assets/warn.webp"/><span>${message.content}</span><span id="close">X</span></div><div style="animation: CloseCard ${time}ms forwards ease-in-out;"></div>`, false, false, (_, e) => e.target.id == "close" && e.target.parentElement.remove(), null, { id: "error-card", content: message })[0].style.backgroundColor = color
    setTimeout(() => document.getElementById("error-card")?.remove(), time)
}

function ToggleNotification(chat) {
    const chatElement = document.getElementById(chat._id)
    chatElement.children[2].style.display = chat.newMessages ? "block" : "none"
    chatElement.children[2].innerText = chat.newMessages
}

function ToggleGroupImageDisplay(imageSrc) {
    groupImageDisplay.src = imageSrc || "./assets/default.webp"
    groupImageDisplay.style.border = imageSrc ? "2px solid var(--second-color-theme)" : ''
    imageSrc ? groupFileInp.setAttribute("file", imageSrc) : groupFileInp.removeAttribute("file")
    if (!imageSrc) groupFileInp.files = null
}

// TODO: Fix the message editing feature (can't change the file)
async function SendMessageHandle() {
    if (!messageFileInp.hasAttribute("file") && (!messageInp.value || messageInp.value.match(/\&[^\s\&\;]+\;|^\s+$/g))) return
    const fileToSend = messageFileInp.hasAttribute("file") && JSON.parse(messageFileInp.getAttribute("file"))
    const rawMessage = { 
        id: Number(messageInp.getAttribute("messageToEditID")) || crypto.getRandomValues(new Int16Array(10))[0], 
        contentType: messageFileInp.hasAttribute("file") ? "file" : "text", 
        content: fileToSend ? {...fileToSend, description: messageInp.value.trim() } : messageInp.value.trim(), 
        chatID: user.chats[selectedChat]._id, 
    }
    const emitMessage = () => {
        socket.emit('message', { ...rawMessage, action: messageInp.hasAttribute("messageToEditID") ? "edit" : "send", chatType: user.chats[selectedChat].owner ? "group" : "dm" })
        !messageInp.hasAttribute("messageToEditID") && RenderMessages(false, false, true, { ...rawMessage, from: { uid: user.uid }, date: new Date() })
        messageInp.value = ""
        messageInp.removeAttribute("messageToEditID")
        messageFileInp.removeAttribute("file")
        fileSC.children[0].dispatchEvent(new Event('click'))
    } 
    if (fileToSend)
        UploadFile(fileToSend.url, fileToSend.type, messageInp.getAttribute("messageToEditID")).then(url => {
            rawMessage.content.url = url
            emitMessage()
        })
    else
        emitMessage()
}

function ToggleFile(file) {
    fileSC.style.display = !file ? "none" : "flex"
    fileSC.children[1].innerHTML = !file ? null : file.url.includes("image") ? `<img style="width: 44%;" src="${file.url}" alt="${file.name}"/>` : `<svg style="width: 40%;" viewBox="0 0 88 110" width="88" height="110" class=""><path stroke-opacity=".08" stroke="#000" d="M7 2.5h56.929a5.5 5.5 0 0 1 3.889 1.61l15.071 15.072a5.5 5.5 0 0 1 1.611 3.89V104a3.5 3.5 0 0 1-3.5 3.5H7a3.5 3.5 0 0 1-3.5-3.5V6A3.5 3.5 0 0 1 7 2.5z" fill="#FFF" fill-rule="evenodd"></path><path d="M65.5 3.5v15a3 3 0 0 0 3 3h15" stroke-opacity=".12" stroke="#000" fill="#FFF"></path></svg> <h3>${file.name}</h3>`
    fileSC.children[2].innerText = !file ? null : (file.size / 1000) + " KB"
    fileSelec.style.display = !file ? "block" : "none"
    !file ? messageFileInp.removeAttribute("file") : messageFileInp.setAttribute("file", JSON.stringify({ ...file, type: /\.\w+$/g.exec(file.name)[0].trim() }))
}

async function UploadFile(url, type, oldUrl = undefined) {
    const chunkSize = 100000
    const totalChunks = Math.ceil(url.length / chunkSize)
    let response;
    for (let currentChunk = 0; currentChunk <= totalChunks; currentChunk++) {
        response = await fetch(`/api/upload/chunk?userUID=${user.uid}`, {
            method: "POST",
            headers: { 
                'Content-Type': 'application/json',
                'Content-Length': chunkSize
            },
            body: JSON.stringify({ chunk: url.slice(currentChunk * chunkSize, currentChunk * chunkSize + chunkSize), length: url.length, fileType: type, oldFile: oldUrl })
        })
    }
    return (await response.json()).filePath
}

function AddChat(chat, rClear, rPrepend) {
    user.chats.push(chat) 
    RenderChats(rClear, rPrepend, chat)
}

function RenderMessages(clear, prepend, scroll, ...messages) {
    RenderElements(messageView.id, message => 
    message.from.uid == "SYSTEM" ?
    `<div class="message-content" style="text-align: center; margin: 0">${message.content}</div>`
    :
    `${message.from.uid != user.uid ? `<p class="message-header" ${!user.chats[selectedChat].owner && 'style="display: none"'}>${message.from.name}@${message.from.uid}</p>` : '' }
    <div class="message-content">
        ${message.contentType == "text" ? parseMessageContent(message.content, true) : (message.contentType == "file" && message.content.type.match(/png|jpeg|jpg|webp/g) ? `<img src="${message.content.url.length >= 100 ? message.content.url : './api/upload/'+message.content.url}" alt="${message.content.name}"/>` : `<div class="file"><span>${message.content.name}</span> <a style="width: 2vw; height: 4vh;" download="${message.content.name}" href="./api/upload/${message.content.url}"><svg style="width: 100%" viewBox="0 0 24 24" class=""><path d="M19.473 12.2h-4.3V2.9c0-.5-.4-.9-.9-.9h-4.3c-.5 0-.9.4-.9.9v9.3h-4.3c-.8 0-1 .5-.5 1.1l6.8 7.3c.7.9 1.4.7 2.1 0l6.8-7.3c.5-.6.3-1.1-.5-1.1Z" fill="currentColor"></path></svg></a></div>`) + `<p style="margin-top: 1%;">${parseMessageContent(message.content.description)}</p>`}
    </div>
    ${message.content?.description?.length > 200 || message.content?.length > 200 ? `<span class="extend-message">See more ${message.content?.description?.length - 200 || message.content?.length - 200}</span>` : ''}
    <p class="message-time">${new Date(message.date).toLocaleDateString() == new Date().toLocaleDateString() ? `Today ${new Date(message.date).toLocaleTimeString()}` : new Date(message.date).toLocaleDateString()}</p>
    ${message.from.uid == user.uid ? `</div><div class="dot" style="right: 12px;${message.views && (message.views.length > 1 || message.views.length == user.chats[selectedChat].users.length) && "background-color: var(--view-message-color)"}"></div><div class="dot" style="right: 2px;${message.views && "background-color: var(--view-message-color)"}">` : ''}`, 
    clear, prepend, 
        (message, e) => {
            if (e.target.classList.contains("extend-message")) {
                const message = user.chats[selectedChat].messages.find(_message => _message.id == e.target.parentElement.id)
                if (message.contentType == "text")
                    e.target.previousElementSibling.innerHTML = parseMessageContent(message.content, false)
                else
                    e.target.previousElementSibling.children[1].innerHTML = parseMessageContent(message.content.description, false)
                return e.target.remove()
            } 
            const menu = document.getElementById("messageConfigs-view")
            menu.style.left = e.pageX - (e.pageX + (innerWidth * 0.05) > innerWidth ? (innerWidth * 0.04) : 0) + "px"
            menu.style.top = e.pageY - (e.pageY + (innerHeight * 0.05) > innerHeight ? (innerHeight * 0.04) : 0) + "px"
            menu.children[0].style.display = menu.children[1].style.display = message.from.uid == user.uid ? "block" : "none"
            menu.children[2].style.display = message.content.url ? "block" : "none"
            menu.onclick = _e => {
                if (_e.target.id == "delete")
                    return socket.emit("message", { chatID: user.chats[selectedChat]._id, id: message.id, contentURL: message.content.url, contentType: message.content.url ? "file" : "text", chatType: user.chats[selectedChat].owner ? "group" : "dm", action: 'delete' })
                    
                if (_e.target.id == "edit") {
                    messageInp.setAttribute("messageToEditID", message.id)
                    messageInp.value = message.contentType == "text" ? message.content : message.content.description
                    messageInp.focus()
                    return message.contentType == "file" && ToggleFile(message.content)
                }
                if (_e.target.id == "download" && message.content?.url) {
                    const dLink = document.createElement("a")
                    dLink.href = `./api/upload/${message.content.url}`
                    dLink.setAttribute("download",  message.content.name)
                    dLink.click()
                }
            }
            !e.target.parentElement?.getAttribute("viewID") && e.target.parentElement.setAttribute("viewID", "messageConfigs")
        }, message => ["message", message.from.uid == "SYSTEM" && "system", message.from.uid == user.uid  ? "user" : null], ...messages)
    if (scroll) messageView.scrollBy(0, messageView.scrollHeight)
}

function RenderChats(clear, prepend, ...chats) {
    chats.forEach(_chat => {
        const otherUser = !_chat.owner && _chat.users.find(_user => _user.uid != user.uid)
        RenderElements("data-view", chat => 
            `<img src="./api/upload/${otherUser.image || chat.image}" alt="group image"/>
            <span style="display: inline">${chat.name || otherUser.name + '@' + otherUser.uid}</span>
            <span></span>
            <span>${chat.messages[chat.messages.length - 1] ? parseChatMessageDisplay(chat.messages[chat.messages.length - 1]) : ''}</span>
            <svg class="hidden" viewID="groupConfigs" viewBox="0 0 19 20" width="19" height="20"><path fill="currentColor" d="m3.8 6.7 5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.2-7.3-7.2 1.6-1.6z"></path></svg>`, 
        clear, prepend, 
        async (chat, e) => {
            if (e.target.tagName == "svg" || e.target.tagName == "path") {
                const menu = document.getElementById("groupConfigs-view")
                menu.children[0].id = chat.owner == user.uid ? "delete" : "leave"
                menu.children[0].innerText = chat.owner == user.uid ? "Delete" : "Leave"
                menu.children[1].style.display = chat.owner == user.uid ? "block" : "none"
                menu.style.top = e.pageY - (e.pageY >= window.innerHeight - 70 ? 70 : 0) + "px"
                menu.style.left = e.pageX + "px"
                menu.onclick = e => {
                    if (e.target.id == "delete" || e.target.id == "leave")
                        return socket.emit(chat.owner ? "group" : "dm", { id: chat._id, action: e.target.id })
                    document.getElementById(`${e.target.id || e.target.parentElement.id}-modal`).showModal()
                }
            } else if (!user.chats[selectedChat] || (user.chats[selectedChat]._id != chat._id)) {
                if (user.chats[selectedChat]) 
                    document.getElementById(user.chats[selectedChat]._id).style.backgroundColor = "var(--third-color-theme)"
                selectedChat = user.chats.findIndex(_chat => _chat._id == chat._id)
                document.getElementById(chat._id).style.backgroundColor = "var(--third-lighten-color-theme)"
                const chatResponse = (user.chats[selectedChat]?.remainingMessages || typeof user.chats[selectedChat].remainingMessages == 'undefined') && (await (await fetch(`/api/chat/${chat._id}?messagesAmmount=12&userUID=${user.uid}&userAuthToken=${user.authToken}${!chat.owner && "&isDM=true" }`)).json()).chat
                user.chats[selectedChat] = { ...user.chats[selectedChat], ...chatResponse, messages: chatResponse?.messages || user.chats[selectedChat].messages }
                chatInfo.children[0].src = `./api/upload/${otherUser.image || chat.image}`
                chatInfo.children[1].children[0].innerText = user.chats[selectedChat].name || otherUser.name
                messageView.style.display = "flex"
                document.getElementById("messageInput").style.display = "flex"
                chatInfo.classList.remove("hidden")
                document.getElementById("messages-placeholder").classList.add("hidden")
                messageView.classList.remove("hidden")
                for (let i = user.chats[selectedChat].messages.length - user.chats[selectedChat].newMessages; i < user.chats[selectedChat].messages.length; i++)
                    socket.emit("message", { chatID: user.chats[selectedChat]._id, chatType: chat.owner ? "group" : "dm", id: user.chats[selectedChat].messages[i].id, action: "view" });
                user.chats[selectedChat].newMessages = 0
                ToggleNotification(user.chats[selectedChat])
                RenderMessages(true, false, true, ...user.chats[selectedChat].messages)
            }
        }, () => ["chat", "flex-set", "data-element"], _chat)
    })
}

function RenderInvites(clear, ...invites) {
    if (invites.length == 0) return document.getElementById("invites-modal").innerHTML = `<h2 style="margin: 10px;">User has no invites</h2>`
    document.getElementById("invites-modal").innerHTML = `<h2 style="margin: 10px;">Loading invites...</h2>`
    invites.forEach(async invite => {
        const fromUser = (await (await fetch(`/api/user/find/${invite.from}`)).json()).user
        const toGroup = (await (await fetch(`/api/chat/find/${invite.group._id}`)).json()).group
        RenderElements("invites-modal", () => `<span style="font-size: 2pc; height: 6.5vh;" id="expand">+</span><span>${fromUser.name}@${fromUser.uid}</span><span>${toGroup.name}</span><button method="accept">Join</button><button method="neglect">Delete</button><div class="hidden"><p>${toGroup.description}</p></div>`, clear, false, (_, e) => {
            e.target.tagName == "BUTTON" && socket.emit("invite", { id: e.target.parentElement.id, group: invite.group, action: "handle", method: e.target.getAttribute("method") }) && (e.target.getAttribute("method") == "accept" && ShowInfoCard("Group joined", 2000, "rgb(0, 255, 0)"))
        }, () => ["invite"], invite)
    })
}

function RenderElements(viewID, innerHTML, clear, prepend, onclick, classList, ...elements) {
    if (elements.length == 0 && !clear) return
    let rElements = []
    const viewElement = document.getElementById(viewID)
    if (clear) viewElement.innerHTML = ''
    elements.forEach(element => {
        const elementToRender = document.createElement("div")
        elementToRender.id = element._id || element.id
        elementToRender.innerHTML = innerHTML(element)
        if (classList) elementToRender.className = classList(element).join(' ')
        if (onclick) elementToRender.addEventListener('click', async e => await onclick(element, e))
        prepend ? viewElement.prepend(elementToRender) : viewElement.appendChild(elementToRender)
        rElements.push(elementToRender)
    })
    return rElements
}