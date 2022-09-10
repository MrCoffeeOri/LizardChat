import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

const authToken = new URLSearchParams(window.location.search).get('authToken')
const socket = io(window.location.host, { auth: { token: authToken, userID: new URLSearchParams(window.location.search).get('userID') } })
const messageView = document.getElementById("messages-view")
const searchInput = document.querySelector("#search > div > input")
const messageInp = document.querySelector("#messageInput > input")
const loadingIntro = document.getElementById("loading-intro")
const chatInfo = document.getElementById("chat-info")
const inviteNotification = document.getElementById("invites-notification")
const notificationAudio = new Audio("../assets/notificationSound.mp3")
const loadingInterval = setInterval(() => loadingIntro.children[2].innerHTML = loadingIntro.children[2].innerHTML.includes('...') ? "Connecting." : loadingIntro.children[2].innerHTML + ".", 950)
const parseMessageContent = (message, limit = true) => (message.message.length > 200 && limit ? message.message.slice(0, 200) + '...' : message.message).replaceAll(/(https?:\/\/[^\s]+)/g, url => url.match(/(\.png|\.webp|\.gif|\.jpg)\b/g) ? `<img src="${url}"/>` : url.match(/youtube\.com\/watch\?v=[a-zA-Z0-9]+/g) ? `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${url.split('=')[1]}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : `<a href="${url}" target="_blank">${url}</a>`)
let selectedChat = null, user = null, editingMessage = false, nonViewedMessages = {}

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

document.querySelector("#messageInput > svg").addEventListener('click', SendMessageHandle)
messageInp.addEventListener("keydown", e => e.key == "Enter" && SendMessageHandle())
messageInp.addEventListener('input', e => e.target.value == '' || e.target.value == ' ' || e.target.value == undefined || e.target.value == null ? document.querySelector("#messageInput > svg").classList.add("hidden") : document.querySelector("#messageInput > svg").classList.remove("hidden"))

window.addEventListener("click", e => {
    ["filter-view", "options-view", "messageConfigs-view", "groupConfigs-view"].forEach(other => document.getElementById(other)?.classList.add("hidden"))
    document.getElementById(`${e.target.getAttribute("viewid") || e.path[1].getAttribute("viewid")}-view`)?.classList.toggle("hidden")
})

document.querySelectorAll("#options-view li").forEach(li => li.addEventListener('click', e => {
    if (e.target.id == "sendInvite") {
        const selection = document.getElementById("groupToInvite")
        selection.innerHTML = null
        user.chats.forEach(chat => {
            if (chat?.owner == user.id) {
                selection.appendChild(document.createElement("option"))
                selection.lastChild.value = chat.id
                selection.lastChild.innerHTML = chat.name
            }
        })
        selection.disabled = selection.children.length == 0
        selection.innerHTML = selection.children.length == 0 ? "<option value=''>User has no groups to invite</option>" : selection.innerHTML
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
        const query = (await (await fetch(`/api/query/${e.target.getAttribute("filter").toLowerCase()}/20/${e.target.value}`)).json())?.query.filter(rd => rd.id != user.id && !user.chats.some(chat => chat.id == rd.id))
        if (!query.length || query.length == 0) return document.getElementById("data-view").innerHTML = `<h3 style="text-align: center;">Query data not found</h3>`
        RenderElements("data-view", queryData => `<p class="search-user">${queryData.name}-${queryData.id}</p>`, true, false, queryData => {
            const queryDataViewElement = document.getElementById("queryData-view")
            const closeView = () => {
                queryDataViewElement.style.width = 0
                queryDataViewElement.innerHTML = null
            }
            queryDataViewElement.style.width = "68.15%"
            queryDataViewElement.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="50" height="35" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
                <h1>${queryData.name}-${queryData.id}</h1>
                <button>Send message</button>
            `
            queryDataViewElement.children[0].onclick = closeView
            queryDataViewElement.children[2].onclick = () => {
                socket.emit("DM", { action: "create", userID: queryDataViewElement.children[1].innerText.split('-')[1] })
                closeView()
                searchInput.value = ''
                searchInput.dispatchEvent(new Event("input"))
            }
        }, null, ...query)
    } else if (e.key == "Enter") ShowErrorCard("Enter a search query")
})

document.querySelectorAll("#filter-view > li").forEach(li => li.addEventListener('click', (e) => {
    document.querySelector(`#filter-view > li.selected`)?.classList.remove("selected")
    document.querySelector(`#filter-view`).classList.toggle("hidden")
    e.target.classList.add("selected")
    searchInput.placeholder = 'Search using filter: ' + e.target.id
    searchInput.setAttribute('filter', e.target.id)
}))

document.getElementById("newGroupForm").addEventListener('submit', (e) => {
    e.preventDefault()
    const name = e.target[0].value, description = e.target[1].value;
    socket.emit('group', { name, description, action: "create" })
    e.path[1].classList.add("hidden")
    document.getElementById("background").classList.add("hidden")
    e.target[0].value = ""
    e.target[1].value = ""
})

messageView.addEventListener('scroll', async e => {
    if (e.target.scrollTop == 0 && selectedChat != null && !selectedChat.allMessagesLoaded) {
        const data = (await (await fetch(`/api/chat/${selectedChat.id}/messages/?amount=10&limit=${selectedChat.messages.length}&userID=${user.id}&authToken=${authToken}`)).json())
        selectedChat.allMessagesLoaded = data.remaining == 0
        data.messages.forEach(message => message.from.id != user.id && !message.views.some(view => view == user.id) && socket.emit("message", { groupID: selectedChat.id, id: message.id, action: "view" }))
        messageView.scrollBy(0, document.getElementById(selectedChat.messages[0].id).offsetTop)
        selectedChat.messages.unshift(...data.messages)
        user.chats.splice(user.chats.findIndex(group => group.id == selectedChat.id), 1, selectedChat)
        RenderMessages(false, true, false, ...(data.messages.reverse()))
    }
})

document.getElementById("sendInviteForm").addEventListener('submit', e => {
    e.preventDefault()
    e.path[1].classList.add("hidden")
    document.getElementById("background").classList.add("hidden")
    socket.emit('createInvite', { to: e.target[0].value, groupID: e.target[1].value, action: "create" })
    e.target[0].value = ''
    e.target[1].value = ''
})

socket.on("connect", () => {
    clearInterval(loadingInterval)
    loadingIntro.remove()
    socket.on("user", response => {
        user = response
        user.chats.sort((a, b) => {
            if (a.messages.length == 0) return 0
            if (b.messages.length == 0) return -1
            const aDate = new Date(a.messages[a.messages.length - 1].date)
            const bDate = new Date(b.messages[b.messages.length - 1].date)
            return aDate > bDate ? -1 : aDate < bDate ? 1 : aDate == bDate ? 0 : undefined
        })
        RenderChats(true, false, ...user.chats)
        user.chats.forEach(chat => {
            const nVM = chat.messages.filter(message => message.from.id != user.id && !message.views.some(view => view == user.id))
            nonViewedMessages[chat.id] = nVM.length > 0 ? nVM : undefined
            ToggleNotification(document.getElementById(chat.id), nVM.length > 0)
        })
        document.getElementById("userName").innerText = `${user.name}-${user.id}`
    })

    socket.on("inviteRecived", invite => {
        notificationAudio.play()
        user.invites.push(invite)
        if (!document.getElementById("invites-modal").classList.contains("hidden")) return RenderInvites(false, invite)
        inviteNotification.classList.remove("hidden")
        inviteNotification.innerText = user.invites.length
    })

    socket.on("inviteHandled", response => {
        if (response.chat) {
            user.chats.push(response.chat)
            RenderChats(false, true, response.chat)
        }
        user.invites.splice(user.invites.findIndex(invite => invite.id == response.inviteID), 1)
        document.getElementById(response.inviteID)?.remove()
    })

    socket.on("usersInGroup", response => {
        user.chats.find(group => group.id == response.id).users = response.users
        if (response.id == selectedChat?.id) {
            selectedChat.users = response.users
            const usersParsed = selectedChat.users.map(_user => _user.name == user.name ? "You" : _user.name).join(', ')
            chatInfo.children[1].innerText = usersParsed.slice(0, 50) + (usersParsed.length > 50 ? '...' : '')
        }
    })

    socket.on("message", response => {
        const chat = user.chats.find(group => group.id == response.chatID)
        switch (response.action) {
            case "send":
                document.getElementById(chat.id).remove()
                RenderChats(false, true, chat)
                chat.messages.push(response.message)
                if (!selectedChat || selectedChat.id != response.chatID) {
                    notificationAudio.play()
                    nonViewedMessages[response.chatID] = nonViewedMessages[response.chatID] ? new Array(...nonViewedMessages[response.chatID], response.message) : [response.message]
                    ToggleNotification(document.getElementById(response.chatID), true)
                } else {
                    RenderMessages(false, false, true, response.message)
                    if (response.message.from.id != user.id) socket.emit("message", { chatID: selectedChat.id, id: response.message.id, action: "view" })
                }
                break;
        
            case "edit":
                chat.messages[chat.messages.findIndex(message => message.id == response.message.id)].message = response.message.message
                if (selectedChat?.id == response.chatID) document.querySelector(`#${response.id} .message-content`).innerHTML = parseMessageContent(response.message, false)
                break;

            case "delete":
                chat.messages.splice(chat.messages.findIndex(message => message.id == response.id), 1)
                if (selectedChat?.id == response.chatID) document.getElementById(response.id).remove()
                break;

            case "view":
                chat.messages[chat.messages.findIndex(mesage => mesage.id == response.message.id)].views = response.message.views
                break;
        }
        selectedChat = selectedChat && (response.chatID == selectedChat.id) ? chat : selectedChat
    })

    socket.on("error", response => {
        if (response.error == "Invalid authentication") window.location.href = "/"
        ShowErrorCard(response.error)
    })

    socket.on("disconnect", () => {
        user = null
        window.location.href = "/disconnected.html"
    })

    socket.on("DM", HandleChatEvent)
    socket.on("group", HandleChatEvent)
})

function HandleChatEvent(response) {
    switch (response.action) {
        case "create":
            user.chats.push(response.group || response.dm) 
            RenderChats(false, false, response.group || response.dm)
            break;

        case "leave":
        case "delete":
            if (response.id == selectedChat?.id) selectedChat = null
            user.chats.splice(user.chats.findIndex(chat => chat.id == response.id), 1)
            document.getElementById(response.id).remove()
            messageView.innerHTML = ''
            messageView.style.display = "none"
            document.getElementById("messageInput").style.display = "none"
            chatInfo.classList.add("hidden")
            document.getElementById("messages-placeholder").classList.remove("hidden")
            break;

        case "rename":
            user.chats.find(group => group.id == response.id).name = response.name
            if (selectedChat.id == response.id) {
                selectedChat.name = response.name
                document.getElementById(response.id).children[0].innerText = response.name
            }
            break;
    
        default:
            break;
    }
}

function ShowErrorCard(message) {
    RenderElements("main-view", message => `<span>X</span><p>${message.content}</p><div></div>`, false, false, (_, e) => e.target.tagName == "SPAN" && e.path[1].remove(), null, { id: "error-card", content: message })
    setTimeout(() => document.getElementById("error-card")?.remove(), 3503)
}

function ToggleNotification(chatElement, show = true) {
    const lastMessage = nonViewedMessages[chatElement.id] && new String(nonViewedMessages[chatElement.id][nonViewedMessages[chatElement.id].length - 1].message)
    chatElement.children[1].style.display = show ? "block" : "none"
    chatElement.children[2].style.display = show ? "block" : "none"
    chatElement.children[1].innerText = nonViewedMessages[chatElement.id]?.length
    chatElement.children[2].innerText = lastMessage ? lastMessage.slice(0, 10) + (lastMessage.length > 10 ? '...' : '') : null
}

function SendMessageHandle() {
    if (messageInp.value == '' || messageInp.value == ' ' || messageInp.value == undefined || messageInp.value == null) return
    socket.emit('message', { id: messageInp.getAttribute("messageToEditID"), message: messageInp.value, chatID: selectedChat.id, action: editingMessage ? "edit" : "send" })
    messageInp.value = ""
    editingMessage = false
    messageInp.dispatchEvent(new Event('input'))
}

function OpenModal(e) {
    const bg = document.getElementById("background")
    bg.classList.remove("hidden")
    bg.onclick = () => {
        document.getElementById(`${e.target.id || e.path[1].id}-modal`).classList.add("hidden")
        bg.classList.add("hidden")
    }
    document.getElementById(`${e.target.id || e.path[1].id}-modal`).classList.remove("hidden")
}

function ChatClickHandle(chat) {
    if (!selectedChat || selectedChat.id != chat.id) {
        selectedChat = chat
        const usersParsed = selectedChat.users.map(_user => _user.id == user.id ? "You" : _user.name).join(', ')
        chatInfo.children[0].innerText = selectedChat.owner ? selectedChat.name : document.getElementById(selectedChat.id).children[0].innerText
        chatInfo.children[1].innerText = usersParsed.slice(0, 50) + (usersParsed.length > 50 ? '...' : '')
        messageView.style.display = "flex"
        document.getElementById("messageInput").style.display = "flex"
        chatInfo.classList.remove("hidden")
        document.getElementById("messages-placeholder").classList.add("hidden")
        messageView.classList.remove("hidden")
        ToggleNotification(document.getElementById(selectedChat.id), false)
        RenderMessages(true, false, true, ...selectedChat.messages)
        if (nonViewedMessages[chat.id]) {
            nonViewedMessages[chat.id].forEach(message => socket.emit("message", { chatID: selectedChat.id, id: message.id, action: "view" }))
            delete nonViewedMessages[chat.id]
        }

    }
}

function RenderMessages(clear, prepend, scroll, ...messages) {
    RenderElements(messageView.id, message => `${message.from.id != user.id ? `<p class="message-header">${message.from.name}-${message.from.id}</p>` : '' }<p class="message-content">${parseMessageContent(message, true)}</p>${message.message.length > 200 ? `<span>See more ${message.message.length - 200}</span>` : ''}<p class="message-time">${new Date(message.date).toLocaleDateString() == new Date().toLocaleDateString() ? `Today ${new Date(message.date).toLocaleTimeString()}` : new Date(message.date).toLocaleDateString()}</p>`, clear, prepend, 
        (message, e) => {
            if (e.target.tagName == "SPAN") {
                e.target.previousSibling.innerHTML = parseMessageContent(selectedChat.messages.find(_message => _message.id == e.path[1].id), false)
                e.target.remove()
                return
            } 
            const userMessage = e.path.find(element => element.classList?.contains("user"))
            const menu = document.getElementById("messageConfigs-view")
            menu.style.top = e.pageY + "px"
            menu.style.left = e.pageX + "px"
            menu.onclick = e => {
                if (e.target.id == "delete")
                    socket.emit("message", { chatID: selectedChat.id, id: message.id, action: 'delete' })
                    
                if (e.target.id == "edit") {
                    const messageToEdit = selectedChat.messages.find(_message => _message.id ==  message.id)
                    editingMessage = true
                    messageInp.setAttribute("messageToEditID", message.id)
                    messageInp.value = messageToEdit.message
                    messageInp.focus()
                }
            }
            !userMessage.getAttribute("viewID") && userMessage.setAttribute("viewID", "messageConfigs")
        }, message => ["message", message.from.id == user.id  ? "user" : null], ...messages)
    if (scroll) messageView.scrollBy(0, messageView.scrollHeight)
}

function RenderChats(clear, prepend, ...chats) { 
    RenderElements("data-view", chat => `<span style="display: inline">${chat.owner ? chat.name : chat.users.find(_user => _user.id != user.id).name}</span><span></span><span></span><svg class="hidden" viewID="groupConfigs" viewBox="0 0 19 20" width="19" height="20" class=""><path fill="currentColor" d="m3.8 6.7 5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.2-7.3-7.2 1.6-1.6z"></path></svg>`, clear, prepend, 
    (chat, e) => {
        ChatClickHandle(chat)
        if (e.target.tagName == "svg") {
            const menu = document.getElementById("groupConfigs-view")
            const li = document.createElement("li")
            menu.innerHTML = ''
            li.id = chat.owner == user.id ? "delete" : "leave"
            li.innerText = chat.owner == user.id ? "Delete" : "Leave"
            if (chat.owner == user.id) {
                const li = document.createElement("li")
                li.id = "edit"
                li.innerText = "Edit"
                menu.appendChild(li)
            }
            menu.style.top = e.pageY + "px"
            menu.style.left = e.pageX + "px"
            menu.appendChild(li)
            menu.onclick = e => {
                if (e.target.id != "edit") return socket.emit(chat.owner ? "group" : "DM", { id: chat.id, action: e.target.id })
                document.getElementById("groupName").value = chat.name
                document.getElementById("groupDescription").value = chat.description
                document.getElementById("groupID").value = chat.id
                OpenModal({ target: { id: "groupEdit" } })
            }
        }
    }, () => ["group", "flex-set"], ...chats)
}

function RenderInvites(clear, ...invites) {
    if (invites.length == 0) 
        document.getElementById("invites-modal").innerHTML = `<h2 style="margin: 10px;">User has no invites</h2>`
    else 
        RenderElements("invites-modal", invite => `<span>${invite.from.name}-${invite.from.id}</span><span>${invite.group.name}</span><button action="accept">Join</button><button action="neglect">Delete</button><div class="hidden"><p>${invite.group.description}</p></div>`, clear, false, (invite, e) => {
            if (e.target.tagName == "BUTTON") {
                socket.emit("handleInvite", { id: e.path[1].id, token: invite.token, action: e.target.getAttribute("action") })
                e.path[2].classList.add("hidden")
                document.getElementById("background").classList.add("hidden")
            }
        }, () => ["invite"], ...invites)
}

function RenderElements(viewID, innerHTML, clear, prepend, onclick, classList, ...elements) {
    if (elements.length == 0 && !clear) return
    const viewElement = document.getElementById(viewID)
    if (clear) viewElement.innerHTML = ''
    elements.forEach(element => {
        const elementToRender = document.createElement("div")
        elementToRender.id = element.id
        elementToRender.innerHTML = innerHTML(element)
        if (classList) elementToRender.className = classList(element).join(' ')
        if (onclick) elementToRender.addEventListener('click', e => onclick(element, e))
        prepend ? viewElement.prepend(elementToRender) : viewElement.appendChild(elementToRender)
    })
}