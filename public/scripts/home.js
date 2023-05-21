import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

const authToken = new URLSearchParams(window.location.search).get('authToken')
const socket = io(window.location.host, { auth: { token: authToken, userID: new URLSearchParams(window.location.search).get('userID') } })
const notificationAudio = new Audio("../assets/notificationSound.mp3")
const messageView = document.getElementById("messages-view")
const messageInp = document.querySelector(`#messageInput > input[type="text"]`)
const fileInp = document.getElementById("groupImage")
const searchInput = document.querySelector("#search > div > input")
const fileSelec = document.querySelectorAll("#messageInput > svg")[0]
const loadingIntro = document.getElementById("loading-intro")
const chatInfo = document.getElementById("chat-info")
const groupImageDisplay = document.getElementById("groupImageDisplay")
const inviteNotification = document.getElementById("invites-notification")
const fileSC = document.getElementById("file-showcase")
const fileChunkSize = 1000
const loadingInterval = setInterval(() => loadingIntro.children[2].innerHTML = loadingIntro.children[2].innerHTML.includes('...') ? "Connecting." : loadingIntro.children[2].innerHTML + ".", 950)
const parseMessageContent = (content, limit = true) => (content.length > 200 && limit ? content.slice(0, 200) + '...' : content)
    .replaceAll(/<|>/g, char => char == '<' ? "&lt;" : "&gt;")
    .replaceAll(/\((\^|\$|\_)[^\^\$\_\(\)]+\S\)/g, word => `<span style="${word[1] == '^' ? "font-size: 1.3pc;" : `text-decoration: ${word[1] == '$' ? "line-through" : word[1] == '_' ? "underline": "none"};`}">${word.slice(2, word.length - 1)}</span>`)
    .replaceAll(/(https?:\/\/[^\s\<\>]+)/g, url => url.match(/(\.png|\.webp|\.gif|\.jpg|\.jpeg)\b/g) ? `<img src="${url}"/>` : url.match(/youtube\.com\/watch\?v=[^\s]+/g) ? `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${url.split('=')[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : `<a href="${url}" target="_blank">${url}</a>`)
let selectedChat = null, user = null

if (new URLSearchParams(window.location.search).get('firstTime')) {
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

document.querySelectorAll("#messageInput > svg")[1].addEventListener('click', SendMessageHandle)
messageInp.addEventListener("keydown", e => e.key == "Enter" && SendMessageHandle())
fileSelec.addEventListener('click', () => !fileSC.hasAttribute("file") && fileInp.click())
fileSC.children[3].addEventListener("click", () => fileInp.click())
groupImageDisplay.addEventListener("click", () => fileInp.click())
chatInfo.children[1].children[1].addEventListener("mouseleave", e => e.target.innerText = "See more information")

chatInfo.children[1].children[1].addEventListener("mouseenter", e => {
    if (user.chats[selectedChat].owner) {
        const usersParsed = user.chats[selectedChat].users.map(_user => _user.uid == user.uid ? "You" : _user.name).join(', ')
        e.target.innerText = usersParsed ? usersParsed.slice(0, 50) + (usersParsed.length > 50 ? '...' : '') : ""
    }
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

fileInp.addEventListener("input", e => {
    const reader = new FileReader()
    reader.onloadend = _e => !document.getElementById("newGroup-modal").classList.contains("hidden") ? ToggleGroupImageDisplay(_e.target.result) : ToggleFile({ name: e.target.files[0].name, url: _e.target.result, size: e.target.files[0].size }) 
    reader.readAsDataURL(e.target.files[0])
})

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
    OpenModal(e)
}))

document.getElementById("invites").addEventListener('click', e => {
    inviteNotification.classList.add("hidden")
    inviteNotification.innerText = null
    OpenModal(e)
    RenderInvites(true, ...user.invites)
})

searchInput.addEventListener('input', e => {
    if (e.target.value.length <= 0) RenderChats(true, false, ...user.chats)
    document.querySelector("#search > div > svg").style.display = e.target.value.length > 0 ? "block" : "none"
})

document.querySelector("#search > div > svg").addEventListener('click', () => {
    searchInput.value = ""
    searchInput.dispatchEvent(new Event("input"))
    RenderChats(true, false, ...user.chats)
})

searchInput.addEventListener('keydown', async e => {
    if (e.key == "Enter" && e.target.getAttribute("filter")) {
        document.getElementById("data-view").innerHTML = `<h3 style="text-align: center;">Loading query...</h3>`
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
                queryData.owner ? socket.emit("group", { action: "join", token: queryData.inviteToken, uid: queryData.uid }) : socket.emit("dm", { action: "create", userUID: queryData.uid })
                closeView()
                searchInput.value = ''
            }
        }, () => ["data-element"], ...query)
    } else if (e.key == "Enter") ShowErrorCard("Enter a search query")
})

document.querySelectorAll("#filter-view > li").forEach(li => li.addEventListener('click', (e) => {
    document.querySelector(`#filter-view > li.selected`)?.classList.remove("selected")
    document.querySelector(`#filter-view`).classList.toggle("hidden")
    e.target.classList.add("selected")
    searchInput.placeholder = 'Search using filter: ' + e.target.id
    searchInput.setAttribute('filter', e.target.id)
}))

document.getElementById("newGroupForm").addEventListener('submit', e => {
    e.preventDefault()
    const fileReader = new FileReader()
    fileReader.onloadend = _e => {
        for (let i = 0; i < _e.target.result.length / fileChunkSize; i++)
            socket.emit("file", _e.target.result.slice(fileChunkSize * i, fileChunkSize * i + fileChunkSize).trim())
        socket.emit("file", null, true, "png")
        socket.emit('group', { name: e.target[0].value, description: e.target[1].value, action: "create" })
        e.target[0].value = ""
        e.target[1].value = ""
        e.target[2].files = null
        ToggleGroupImageDisplay()
    }
    fileReader.readAsDataURL(e.target[2].files[0])
    e.target.offsetParent.classList.add("hidden")
    document.getElementById("background").classList.add("hidden")
})

messageView.addEventListener('scroll', async e => {
    if (e.target.scrollTop == 0 && user.chats[selectedChat] && user.chats[selectedChat].remainingMessages) {
        const data = (await (await fetch(`/api/chat/${user.chats[selectedChat]._id}/messages/?amount=10&limit=${user.chats[selectedChat].messages.length}&userUID=${user.uid}&userAuthToken=${authToken}`)).json())
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
    e.preventDefault()
    if (e.target[1].disabled) return
    e.target.parentElement.classList.add("hidden")
    document.getElementById("background").classList.add("hidden")
    socket.emit('invite', { to: e.target[0].value, chatID: e.target[1].value, action: "create" })
    e.target[0].value = ''
    e.target[1].value = ''
})

socket.on("connect", () => {
    socket.on("user", response => {
        const info = document.getElementById("info")
        user = response
        console.log(user)
        user.chats.sort((a, b) => {
            if (!a.messages[a.messages.length - 1]) return 0
            if (!b.messages[b.messages.length - 1]) return -1
            return new Date(b.messages[b.messages.length - 1].date) - new Date(a.messages[a.messages.length - 1].date)
        })
        RenderChats(true, false, ...user.chats)
        user.chats.forEach(chat => ToggleNotification(chat))
        info.children[0].src = (user.image == "default" || !user.image) ? "../assets/default.webp" : user.image
        info.children[1].innerText = `${user.name}@${user.uid}`
        clearInterval(loadingInterval)
        loadingIntro.remove()
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
                if (response.chat) {
                    user.chats.push(response.chat)
                    RenderChats(false, true, response.chat)
                }
                user.invites = user.invites.filter(invite => invite.id != response.inviteID)
                document.getElementById(response.inviteID)?.remove()
                break;
        }
    })

    socket.on("userInChat", async response => {
        const resUser = await (await fetch(`/api/user/find/${response.userUID}`)).json()
        if (!resUser.user)
            return ShowErrorCard(resUser.error)

        user.chats.find(chat => chat._id == response.id).users.push(resUser.user)
        if (response.id == user.chats[selectedChat]?._id) {
            user.chats[selectedChat].users.push(resUser.user)
            chatInfo.children[1].innerText = (chatInfo.children[1].innerText + ", " + resUser.user.name).slice(0, 50) + (chatInfo.children[1].innerText.length > 50 ? "..." : '')
        }
    })

    socket.on("message", response => {
        const chat = user.chats.find(chat => chat._id == response.chatID)
        switch (response.action) {
            case "send":
                document.getElementById(chat._id).remove()
                RenderChats(false, true, chat)
                chat.messages.push(response.message)
                document.getElementById(chat._id).children[3].innerText = response.message.contentType == "text" ? `${response.message.content.slice(0, 10) + (response.message.content.length > 10 ? '...' : '')} ${new Date(response.message.date).toLocaleTimeString()}` : response.message.content.name
                if (selectedChat == null || user.chats[selectedChat]._id != response.chatID) {
                    notificationAudio.play()
                    chat.newMessages++
                    return ToggleNotification(chat, true)
                }
                if (response.message.from.uid != user.uid) {
                    socket.emit("message", { chatID: user.chats[selectedChat]._id, id: response.message.id, chatType: chat.owner ? "group" : "dm", action: "view" }) 
                    RenderMessages(false, false, true, response.message)
                }
                break;
        
            case "edit":
                chat.messages[chat.messages.findIndex(message => message.id == response.message.id)].content = response.message.content
                if (chat.messages[chat.messages.length - 1].id == response.message.id && chat.messages[chat.messages.length - 1].contentType == "text") 
                    document.getElementById(chat._id).children[3].innerText = `${response.message.content.slice(0, 10) + (response.message.content.length > 10 ? '...' : '')} ${new Date(response.message.date).toLocaleTimeString()}`;
                if (user.chats[selectedChat]?._id == response.chatID) 
                    document.getElementById(response.message.id).children[0].innerHTML = response.message.contentType == "text" ? parseMessageContent(response.message.content, false) :  (response.message.content.url.includes("image") ? `<img src="${response.message.content.url}" alt="${response.message.content.name}"/>` : `<div class="file"><span>${response.message.content.name}</span> <a style="width: 2vw; height: 4vh;" download="${response.message.content.name}" href="${response.message.content.url}"><svg style="width: 100%" viewBox="0 0 24 24" class=""><path d="M19.473 12.2h-4.3V2.9c0-.5-.4-.9-.9-.9h-4.3c-.5 0-.9.4-.9.9v9.3h-4.3c-.8 0-1 .5-.5 1.1l6.8 7.3c.7.9 1.4.7 2.1 0l6.8-7.3c.5-.6.3-1.1-.5-1.1Z" fill="currentColor"></path></svg></a></div>`) + `<p style="margin-top: 1%;">${parseMessageContent(response.message.content.description)}</p>`;
                break;

            case "delete":
                if (chat.messages[chat.messages.length - 1].id == response.message.id)
                    document.getElementById(chat._id).children[3].innerText = chat.messages[chat.messages.length - 2] ? chat.messages[chat.messages.length - 2].contentType == "text" ? `${chat.messages[chat.messages.length - 2].content.slice(0, 10) + (chat.messages[chat.messages.length - 2].content.length > 10 ? '...' : '')} ${new Date(chat.messages[chat.messages.length - 2].date).toLocaleTimeString()}` : chat.messages[chat.messages.length - 2].content.name : null;
                if (user.chats[selectedChat]?._id == response.chatID) 
                    document.getElementById(response.message.id).remove();
                chat.messages.splice(chat.messages.findIndex(message => message.id == response.message.id), 1)
                break;

            case "view":
                chat.messages[chat.messages.findIndex(message => message.id == response.message.id)].views = response.message.views
                break;
        }
        user.chats[selectedChat] = response.chatID == user.chats[selectedChat]?._id ? chat : user.chats[selectedChat]
    })

    socket.on("error", response => {
        if (response.error == "Invalid authentication") window.location.href = "/"
        ShowErrorCard(response.error)
    })

    socket.on("disconnect", () => {
        user = null
        window.location.href = "/disconnected.html"
    })

    socket.on("chat", response => {
        switch (response.action) {
            case "create":
            case "join":
                user.chats.push(response.chat) 
                RenderChats(false, false, response.chat)
                break;
    
            case "leave":
            case "delete":
                user.chats.splice(selectedChat, 1)
                document.getElementById(response.id).remove()
                messageView.innerHTML = ''
                messageView.style.display = "none"
                document.getElementById("messageInput").style.display = "none"
                chatInfo.classList.add("hidden")
                document.getElementById("messages-placeholder").classList.remove("hidden")
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
})

function ShowErrorCard(message) {
    RenderElements("main-view", message => `<span>X</span><p>${message.content}</p><div></div>`, false, false, (_, e) => e.target.tagName == "SPAN" && e.path[1].remove(), null, { id: "error-card", content: message })
    setTimeout(() => document.getElementById("error-card")?.remove(), 3503)
}

function ToggleNotification(chat) {
    const chatElement = document.getElementById(chat._id)
    chatElement.children[2].style.display = chat.newMessages ? "block" : "none"
    chatElement.children[2].innerText = chat.newMessages
}

function ToggleGroupImageDisplay(imageSrc) {
    groupImageDisplay.src = imageSrc || "./assets/default.webp"
    groupImageDisplay.style.border = imageSrc ? "2px solid var(--second-color-theme)" : ''
}

function SendMessageHandle() {
    if (!fileSC.hasAttribute("file") && (!messageInp.value || messageInp.value.match(/\&[^\s\&\;]+\;|^\s+$/g))) return
    const rawMessage = { 
        id: Number(messageInp.getAttribute("messageToEditID")) || crypto.getRandomValues(new Int16Array(10))[0], 
        contentType: fileSC.hasAttribute("file") ? "file" : "text", 
        content: fileSC.hasAttribute("file") ? {...JSON.parse(fileSC.getAttribute("file")), description: messageInp.value.trim() } : messageInp.value.trim(), 
        chatID: user.chats[selectedChat]._id, 
    }
    socket.emit('message', { ...rawMessage, action: messageInp.hasAttribute("messageToEditID") ? "edit" : "send", chatType: user.chats[selectedChat].owner ? "group" : "dm" })
    !messageInp.hasAttribute("messageToEditID") && RenderMessages(false, false, true, { ...rawMessage, from: { uid: user.uid }, date: new Date() })
    messageInp.value = ""
    messageInp.removeAttribute("messageToEditID")
    fileSC.children[0].dispatchEvent(new Event('click'))
}

function OpenModal(e) {
    const bg = document.getElementById("background")
    const modal = document.getElementById(`${e.target.id || e.target.parentElement.id}-modal`)
    bg.classList.remove("hidden")
    bg.onclick = () => {
        modal.classList.add("hidden")
        bg.classList.add("hidden")
    }
    modal.classList.remove("hidden")
}

function ToggleFile(file) {
    fileSC.style.display = !file ? "none" : "flex"
    fileSC.children[1].innerHTML = !file ? null : file.url.includes("image") ? `<img style="width: 44%;" src="${file.url}" alt="${file.name}"/>` : `<svg style="width: 40%;" viewBox="0 0 88 110" width="88" height="110" class=""><path stroke-opacity=".08" stroke="#000" d="M7 2.5h56.929a5.5 5.5 0 0 1 3.889 1.61l15.071 15.072a5.5 5.5 0 0 1 1.611 3.89V104a3.5 3.5 0 0 1-3.5 3.5H7a3.5 3.5 0 0 1-3.5-3.5V6A3.5 3.5 0 0 1 7 2.5z" fill="#FFF" fill-rule="evenodd"></path><path d="M65.5 3.5v15a3 3 0 0 0 3 3h15" stroke-opacity=".12" stroke="#000" fill="#FFF"></path></svg> <h3>${file.name}</h3>`
    fileSC.children[2].innerText = !file ? null : (file.size / 1000) + " KB"
    fileSelec.style.display = !file ? "block" : "none"
    !file ? fileSC.removeAttribute("file") : fileSC.setAttribute("file", JSON.stringify(file))
}

function RenderMessages(clear, prepend, scroll, ...messages) {
    RenderElements(messageView.id, message => `${message.from.uid != user.uid ? `<p class="message-header">${message.from.name}-${message.from.uid}</p>` : '' }<div class="message-content">${message.contentType == "text" ? parseMessageContent(message.content, true) : (message.contentType == "file" && message.content.url.includes("image") ? `<img src="${message.content.url}" alt="${message.content.name}"/>` : `<div class="file"><span>${message.content.name}</span> <a style="width: 2vw; height: 4vh;" download="${message.content.name}" href="${message.content.url}"><svg style="width: 100%" viewBox="0 0 24 24" class=""><path d="M19.473 12.2h-4.3V2.9c0-.5-.4-.9-.9-.9h-4.3c-.5 0-.9.4-.9.9v9.3h-4.3c-.8 0-1 .5-.5 1.1l6.8 7.3c.7.9 1.4.7 2.1 0l6.8-7.3c.5-.6.3-1.1-.5-1.1Z" fill="currentColor"></path></svg></a></div>`) + `<p style="margin-top: 1%;">${parseMessageContent(message.content.description)}</p>`}</div>${message.content?.description?.length > 200 || message.content?.length > 200 ? `<span class="extend-message">See more ${message.content?.description?.length - 200 || message.content?.length - 200}</span>` : ''}<p class="message-time">${new Date(message.date).toLocaleDateString() == new Date().toLocaleDateString() ? `Today ${new Date(message.date).toLocaleTimeString()}` : new Date(message.date).toLocaleDateString()}</p>`, clear, prepend, 
        (message, e) => {
            if (e.target.classList.contains("extend-message")) {
                const message = user.chats[selectedChat].messages.find(_message => _message.id == e.path[1].id)
                if (message.contentType == "text")
                    e.target.previousSibling.innerHTML = parseMessageContent(message.content, false)
                else
                    e.target.previousSibling.children[1].innerHTML = parseMessageContent(message.content.description, false)
                return e.target.remove()
            } 
            const userMessage = e.target.closest(".user")
            const menu = document.getElementById("messageConfigs-view")
            menu.style.left = e.pageX - (e.pageX + (innerWidth * 0.05) > innerWidth ? (innerWidth * 0.04) : 0) + "px"
            menu.style.top = e.pageY - (e.pageY + (innerHeight * 0.05) > innerHeight ? (innerHeight * 0.04) : 0) + "px"
            menu.children[2].style.display = message.content.url?.includes("image") ? "block" : "none"
            menu.onclick = _e => {
                if (_e.target.id == "delete")
                    return socket.emit("message", { chatID: user.chats[selectedChat]._id, id: message.id, chatType: user.chats[selectedChat].owner ? "group" : "dm", action: 'delete' })
                    
                if (_e.target.id == "edit") {
                    messageInp.setAttribute("messageToEditID", message.id)
                    messageInp.value = message.contentType == "text" ? message.content : message.content.description
                    messageInp.focus()
                    return message.contentType == "file" && ToggleFile(message.content)
                }
                if (_e.target.id == "download" && message.content?.url.includes("image")) {
                    const dLink = document.createElement("a")
                    dLink.href = message.content.url
                    dLink.setAttribute("download",  message.content.name)
                    dLink.click()
                }
            }
            !userMessage?.getAttribute("viewID") && userMessage.setAttribute("viewID", "messageConfigs")
        }, message => ["message", message.from.uid == user.uid  ? "user" : null], ...messages)
    if (scroll) messageView.scrollBy(0, messageView.scrollHeight)
}

function RenderChats(clear, prepend, ...chats) { 
    RenderElements("data-view", chat => `<img src="${chat.image == "default" ? "./assets/default.webp" : "./api/upload/" + chat.image}" alt="group image"/><span style="display: inline">${chat.name}</span><span></span><span>${chat.messages[chat.messages.length - 1] ? chat.messages[chat.messages.length - 1].contentType == "text" ? chat.messages[chat.messages.length - 1].content.slice(0, 10) + (chat.messages[chat.messages.length - 1].content.length > 10 ? '...' : '') + ' ' + new Date(chat.messages[chat.messages.length - 1].date).toLocaleTimeString() : chat.messages[chat.messages.length - 1].content.name : ''}</span><svg class="hidden" viewID="groupConfigs" viewBox="0 0 19 20" width="19" height="20" class=""><path fill="currentColor" d="m3.8 6.7 5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.2-7.3-7.2 1.6-1.6z"></path></svg>`, 
    clear, prepend, 
    async (chat, e) => {
        if (selectedChat == null || (user.chats[selectedChat]._id != chat._id)) {
            if (selectedChat != null) 
                document.getElementById(user.chats[selectedChat]._id).style.backgroundColor = "var(--third-color-theme)"
            selectedChat = user.chats.findIndex(_chat => _chat._id == chat._id)
            document.getElementById(chat._id).style.backgroundColor = "var(--third-lighten-color-theme)"
            const chatResponse = (user.chats[selectedChat]?.remainingMessages || typeof user.chats[selectedChat].remainingMessages == 'undefined') && (await (await fetch(`/api/chat/${chat._id}?messagesAmmount=12&userUID=${user.uid}&userAuthToken=${user.authToken}${!chat.owner && "&isDM=true" }`)).json()).chat
            user.chats[selectedChat] = { ...user.chats[selectedChat], ...chatResponse, messages: chatResponse?.messages || user.chats[selectedChat].messages }
            chatInfo.children[0].src = chat.image == "default" ? "./assets/default.webp" : `./api/upload/${chat.image}`
            chatInfo.children[1].children[0].innerText = user.chats[selectedChat].name
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
        if (e.target.tagName == "svg" || e.target.tagName == "path") {
            const menu = document.getElementById("groupConfigs-view")
            menu.children[0].id = chat.owner == user.uid ? "delete" : "leave"
            menu.children[0].innerText = chat.owner == user.uid ? "Delete" : "Leave"
            menu.children[1].style.display = chat.owner == user.uid ? "block" : "none"
            menu.style.top = e.pageY - (e.pageY >= window.innerHeight - 70 ? 70 : 0) + "px"
            menu.style.left = e.pageX + "px"
            menu.onclick = e => {
                if (e.target.id == "delete" || e.target.id == "leave") selectedChat = null
                if (e.target.id != "edit") return socket.emit(chat.owner ? "group" : "dm", { id: chat._id, action: e.target.id })
                OpenModal({ target: { id: "groupEdit" } })
            }
        }
    }, () => ["chat", "flex-set", "data-element"], ...chats)
}

function RenderInvites(clear, ...invites) {
    if (invites.length == 0) return document.getElementById("invites-modal").innerHTML = `<h2 style="margin: 10px;">User has no invites</h2>`
    document.getElementById("invites-modal").innerHTML = `<h2 style="margin: 10px;">Loading invites...</h2>`
    invites.forEach(async invite => {
        const fromUser = (await (await fetch(`/api/user/find/${invite.from}`)).json()).user
        RenderElements("invites-modal", () => `<span>${fromUser.name}-${fromUser.uid}</span><span>${invite.group.name}</span><button method="accept">Join</button><button method="neglect">Delete</button><div class="hidden"><p>${invite.group.description}</p></div>`, clear, false, (_, e) => {
            if (e.target.tagName == "BUTTON") {
                socket.emit("invite", { id: e.path[1].id, group: invite.group, action: "handle", method: e.target.getAttribute("method") })
                e.path[2].classList.add("hidden")
                document.getElementById("background").classList.add("hidden")
            }
        }, () => ["invite"], invite)
    })
}

function RenderElements(viewID, innerHTML, clear, prepend, onclick, classList, ...elements) {
    if (elements.length == 0 && !clear) return
    const viewElement = document.getElementById(viewID)
    if (clear) viewElement.innerHTML = ''
    elements.forEach(element => {
        const elementToRender = document.createElement("div")
        elementToRender.id = element._id || element.id
        elementToRender.innerHTML = innerHTML(element)
        if (classList) elementToRender.className = classList(element).join(' ')
        if (onclick) elementToRender.addEventListener('click', async e => await onclick(element, e))
        prepend ? viewElement.prepend(elementToRender) : viewElement.appendChild(elementToRender)
    })
}
