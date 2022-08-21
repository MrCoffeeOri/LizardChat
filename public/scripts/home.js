import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

const authToken = new URLSearchParams(window.location.search).get('authToken')
const socket = io(window.location.host, { auth: { token: authToken, userID: new URLSearchParams(window.location.search).get('userID') } })
const messageView = document.getElementById("messages-view")
const searchInput = document.querySelector("#search > div > input")
const messageInp = document.querySelector("#messageInput > input")
const loadingIntro = document.getElementById("loading-intro")
const groupInfo = document.getElementById("group-info")
const loadingInterval = setInterval(() => loadingIntro.children[2].innerHTML = loadingIntro.children[2].innerHTML.includes('...') ? "Connecting." : loadingIntro.children[2].innerHTML + ".", 950)
let selectedGroup = null, user = null

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
window.addEventListener("click", e => ShowUniqueElement(`#${e.target.getAttribute("viewid") || e.path[1].getAttribute("viewid")}-view`, "#filter-view", "#options-view", "#messageConfigs-view", "#groupConfigs-view"))

document.querySelectorAll("#options-view li").forEach(li => li.addEventListener('click', e => {
    if (e.target.id == "sendInvite") {
        const selection = document.getElementById("groupToInvite")
        user.groups.forEach(group => {
            if (group.owner == user.id) {
                selection.appendChild(document.createElement("option"))
                selection.lastChild.value = group.id
                selection.lastChild.innerHTML = group.name
            }
        })
        if (selection.children.length == 0) {
            selection.innerHTML = "<option value=''>User has no groups to invite</option>"
            selection.disabled = true
            return
        }
    }
    OpenModal(e)
}))

document.getElementById("invites").addEventListener('click', e => {
    RenderInvites(true, ...user.invites)
    OpenModal(e)
})

searchInput.addEventListener('input', e => {
    if (e.target.value.length <= 0) RenderGroups(true, ...user.groups)
    document.querySelector("#search > div > svg").style.display = e.target.value.length > 0 ? "block" : "none"
})

document.querySelector("#search > div > svg").addEventListener('click', () => {
    searchInput.value = ""
    searchInput.dispatchEvent(new Event("input"))
    RenderGroups(true, ...user.groups)
})

searchInput.addEventListener('keydown', async e => {
    if (e.key == "Enter" && e.target.getAttribute("filter")) {
        const data = await (await fetch(`/api/query/${e.target.getAttribute("filter").toLowerCase()}/20/${e.target.value}`)).json()
        if (data.message != "Success")
            return alert(data.message)

        RenderElements("data-view", queryData => `<p class="search-user">${queryData.name}</p>`, true, false, null, null, ...data.query)
    } else if (e.key == "Enter")
        alert("Please enter a search query")
})

document.querySelectorAll("#filter-view > li").forEach(li => li.addEventListener('click', (e) => {
    document.querySelector(`#filter-view > li.selected`)?.classList.remove("selected")
    document.querySelector(`#filter-view`).classList.toggle("hidden")
    e.target.classList.add("selected")
    searchInput.placeholder = 'Search using filter: ' + e.target.id
    searchInput.setAttribute('filter', e.target.id)
}))

messageInp.addEventListener('input', (e) => {
    if (e.target.value == '' || e.target.value == ' ' || e.target.value == undefined || e.target.value == null)
        document.querySelector("#messageInput > svg").classList.add("hidden")
    else
        document.querySelector("#messageInput > svg").classList.remove("hidden")
})

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
    if (e.target.scrollTop == 0 && selectedGroup != null && !selectedGroup.allMessagesLoaded) {
        const data = (await (await fetch(`/api/group/${selectedGroup.id}/messages/?amount=10&limit=${selectedGroup.messages.length < 10 ? 10 : selectedGroup.messages.length}&userID=${user.id}&authToken=${authToken}`)).json())
        selectedGroup.allMessagesLoaded = data.remaining == 0
        if (data.messages[0].id == selectedGroup.messages[0].id) return
        RenderMessages(false, true, false, ...(new Array(...data.messages).reverse()))
        messageView.scrollBy(0, document.getElementById(selectedGroup.messages[0].id).offsetTop - 10)
        selectedGroup.messages.unshift(...data.messages)
        user.groups.find(group => group.id == selectedGroup.id).messages = selectedGroup.messages
    }
})

document.getElementById("sendInviteForm").addEventListener('submit', e => {
    e.preventDefault()
    e.path[1].classList.add("hidden")
    document.getElementById("background").classList.add("hidden")
    socket.emit('createInvite', { to: e.target[0].value, groupID: e.target[1].value, action: "create" })
})

socket.on("connect", () => {
    clearInterval(loadingInterval)
    loadingIntro.remove()
    socket.on("user", response => { 
        user = response
        console.log(user)
        document.getElementById("userName").innerText = `${user.name}-${user.id}`
        RenderGroups(true, ...user.groups)
    })

    socket.on("inviteRecived", invite => {
        user.invites.push(invite)
        if (!document.getElementById("invites-modal").classList.contains("hidden")) RenderInvites(false, invite)
    })

    socket.on("usersInGroup", response => {
        user.groups.find(group => group.id == response.id).users = response.users
        if (response.id == selectedGroup.id) {
            selectedGroup.users = response.users
            const usersParsed = selectedGroup.users.map(_user => _user.name == user.name ? "You" : _user.name).join(', ')
            groupInfo.children[1].innerText = usersParsed.slice(0, 50) + (usersParsed.length > 50 ? '...' : '')
        }
    })

    socket.on("groupEvent", response => {
        switch (response.action) {
            case "create":
                user.groups.push(response.group)
                RenderGroups(false, response.group)
                break;

            case "leave":
            case "delete":
                user.groups.splice(user.groups.findIndex(group => group.id == response.id), 1)
                groupInfo.classList.add("hidden")
                document.getElementById(response.id).remove()
                messageView.innerHTML = ''
                messageView.style.display = "none"
                document.getElementById("messageInput").style.display = "none"
                document.getElementById("messages-placeholder").classList.remove("hidden")
                break;

            case "rename":
                user.groups.find(group => group.id == response.id).name = response.name
                if (selectedGroup.id == response.id) {
                    selectedGroup.name = response.name
                    document.getElementById(response.id).children[0].innerText = response.name
                }
                break;
        
            default:
                break;
        }
    })

    socket.on("message", response => {
        for (const group of user.groups) {
            if (group.id == response.groupID) {
                switch (response.action) {
                    case "send":
                        group.messages.push(response.message)
                        RenderMessages(false, false, true, response.message)
                        break;
                
                    case "edit":
                        group.messages[group.messages.findIndex(message => message.id == response.message.id)] = response.message
                        document.getElementById(response.messageID).innerText = response.message
                        break;

                    case "delete":
                        group.messages.splice(group.messages.findIndex(message => message.id == response.messageID), 1)
                        document.getElementById(response.messageID).remove()
                        break;
                }
                if (selectedGroup.id == response.groupID) selectedGroup = group
                break
            }
        }
    })

    socket.on("error", response => {
        alert(response.error)
    })

    socket.on("disconnect", () => {
        user = null
        window.location.href = "/disconnected.html"
    })
})

/*document.querySelector('aside > #info > div > img').addEventListener('click', () => {
 // Config modal
})
*/

function SendMessageHandle() {
    if (messageInp.value == '' || messageInp.value == ' ' || messageInp.value == undefined || messageInp.value == null) return
    socket.emit('message', { message: messageInp.value, groupID: selectedGroup.id, action: "send" })
    messageInp.value = ""
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

async function GroupClickHandle(group) {
    if (!selectedGroup || selectedGroup.id != group.id) {
        selectedGroup = { ...group, allMessagesLoaded: false }
        const usersParsed = selectedGroup.users.map(_user => _user.name == user.name ? "You" : _user.name).join(', ')
        groupInfo.classList.remove("hidden")
        groupInfo.children[0].innerText = selectedGroup.name
        groupInfo.children[1].innerText = usersParsed.slice(0, 50) + (usersParsed.length > 50 ? '...' : '')
        document.getElementById("messages-placeholder").classList.add("hidden")
        messageView.classList.remove("hidden")
        messageView.style.display = "flex"
        document.getElementById("messageInput").style.display = "flex"
        RenderMessages(true, false, true, ...selectedGroup.messages)
    }
}

function ShowUniqueElement(source,...others) {
    others.forEach(other => document.querySelector(other)?.classList.add("hidden"))
    document.querySelector(source)?.classList.toggle("hidden")
}

function RenderMessages(clear, prepend, scroll, ...messages) {
    RenderElements(messageView.id, message => `${message.from.split('-')[1] != user.id ? `<p class="message-header">${message.from}</p>` : '' }<p class="message-content">${message.message.length > 200 ? message.message.slice(0, 200) + '...' : message.message}</p>${message.message.length > 200 ? `<span>See more ${message.message.length - 200}</span>` : ''}<p class="message-time">${message.date.split(' ')[0] == new Date().toLocaleDateString() ? message.date.split(' ')[1] : message.date}</p>`, clear,prepend, 
        (message, e) => {
            if (e.target.tagName == "SPAN") {
                e.target.previousElementSibling.innerText = selectedGroup.messages.find(_message => _message.id == e.path[1].id).message
                e.target.remove()
            } else if (e.target.classList.contains("user") || e.path[1].classList.contains("user")) {
                e.target.setAttribute("viewID", "messageConfigs")
                const menu = document.getElementById("messageConfigs-view")
                menu.style.top = e.pageY + "px"
                menu.style.left = e.pageX + "px"
                menu.onclick = e => {
                    if (e.target.id == "delete")
                        socket.emit("message", { groupID: selectedGroup.id, messageID: message.id, action: 'delete' })
    
                    if (e.target.id == "edit") {
                        const messageToEdit = selectedGroup.messages.find(_message => _message.id ==  message.id)
                        document.getElementById("messageInput").value = messageToEdit.message
                        document.getElementById("messageInput").focus()
                    }
                }
            }
        }, message => ["message", message.from.split('-')[1] == user.id  ? "user" : null], ...messages)
    if (scroll) messageView.scrollBy(0, messageView.scrollHeight)
}

function RenderGroups(clear, ...groups) { 
    RenderElements("data-view", group => `<span>${group.name}</span><svg viewID="groupConfigs" viewBox="0 0 19 20" width="19" height="20" class=""><path fill="currentColor" d="m3.8 6.7 5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.2-7.3-7.2 1.6-1.6z"></path></svg>`, clear, false, 
    (group, e) => {
        GroupClickHandle(group)
        if (e.target.tagName == "svg") {
            const menu = document.getElementById("groupConfigs-view")
            const li = document.createElement("li")
            menu.innerHTML = ''
            li.id = group.owner == user.id ? "delete" : "leave"
            li.innerText = group.owner == user.id ? "Delete" : "Leave"
            if (group.owner == user.id) {
                const li = document.createElement("li")
                li.id = "edit"
                li.innerText = "Edit"
                menu.appendChild(li)
            }
            menu.style.top = e.pageY + "px"
            menu.style.left = e.pageX + "px"
            menu.appendChild(li)
            menu.onclick = e => {
                if (e.target.id != "edit") {
                    if (group.owner != user.id && e.target.id == "delete") return
                    socket.emit("group", { id: group.id, action: e.target.id })
                } else {
                    document.getElementById("groupName").value = group.name
                    document.getElementById("groupDescription").value = group.description
                    document.getElementById("groupID").value = group.id
                    OpenModal({ target: { id: "groupEdit" } })
                }
            }
        }
    }, () => ["group"], ...groups)
}

function RenderInvites(clear, ...invites) {
    if (invites.length == 0) 
        document.getElementById("invites-modal").innerHTML = `<h2 style="margin: 10px;">User has no invites</h2>`
    else 
        RenderElements("invites-modal", invite => `<span>${invite.from}</span><span>${invite.group.name}</span><button action="accept">Join</button><button action="neglect">Delete</button><div class="hidden"><p>${invite.group.description}</p></div>`, clear, false, (invite, e) => {
            if (e.target.tagName == "BUTTON") {
                socket.emit("handleInvite", { token: e.path[1].id, action: e.target.getAttribute("action") })
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
        elementToRender.id = element.id || element.token
        elementToRender.innerHTML = innerHTML(element)
        if (classList) elementToRender.className = classList(element).join(' ')
        if (onclick) elementToRender.addEventListener('click', e => onclick(element, e))
        prepend ? viewElement.prepend(elementToRender) : viewElement.appendChild(elementToRender)
    })
}
