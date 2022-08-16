import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

const authToken = new URLSearchParams(window.location.search).get('authToken')
const socket = io(window.location.host, { auth: { token: authToken, userID: new URLSearchParams(window.location.search).get('userID') } })
const messageView = document.getElementById("messages-view")
const searchInput = document.querySelector("#search > div > input")
const messageInp = document.querySelector("#messageInput > input")
let selectedGroup = null
let user = null

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

document.querySelectorAll("#options-view li").forEach(li => li.addEventListener('click', e => OpenModal(e)))
//document.getElementById("invites").addEventListener('click', OpenModal)
window.addEventListener("click", e => ShowUniqueElement(`#${e.target.getAttribute("viewid") || e.path[1].getAttribute("viewid")}-view`, "#filter-view", "#options-view", "#messageConfigs-view", "#groupConfigs-view"))

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

//document.getElementById("invites").addEventListener('click', () => )

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
    document.getElementById("newGroup-modal").classList.add("hidden")
    document.getElementById("background").classList.add("hidden")
    e.target[0].value = ""
    e.target[1].value = ""
})

document.querySelector("#messageInput > svg").addEventListener('click', () => {
    if (messageInp.value == '' || messageInp.value == ' ' || messageInp.value == undefined || messageInp.value == null) return
    socket.emit('message', { message: messageInp.value, groupID: selectedGroup.id, action: "send" })
    messageInp.value = ""
    document.querySelector("#messageInput > svg").classList.add("hidden")
})

messageInp.addEventListener("keydown", e => {
    if (e.key == "Enter") {
        socket.emit("message", { message: e.target.value, groupID: selectedGroup.id, action: "send" })
        e.target.value = ''
        e.target.dispatchEvent(new Event('input'))
    }
})

// On scroll, load more messages
messageView.addEventListener('scroll', async e => {
    if (e.target.scrollTop == 0 && selectedGroup != null && !selectedGroup.allMessagesLoaded) {
        const messages = (await (await fetch(`/api/messages/?amount=20&limit=${selectedGroup.messages.length <= 20 ? 20 : selectedGroup.messages.length}&userID=${user.id}&groupID=${selectedGroup.id}&authToken=${authToken}`)).json()).messages
        if (!messages.length) {
            selectedGroup.allMessagesLoaded = true
            return
        }
        RenderMessages(false, true, false, ...(new Array(...messages).reverse()))
        messageView.scrollBy(0, document.getElementById(selectedGroup.messages[0].id).offsetTop - 10)
        selectedGroup.messages.unshift(...messages)
        user.groups.find(group => group.id == selectedGroup.id).messages = selectedGroup.messages
    }
})

socket.on("connect", () => {
    socket.on("user", response => { 
        user = response
        console.log(user)
        document.getElementById("userName").innerText = user.name
        RenderGroups(true, ...user.groups)
    })

    socket.on("groupEvent", response => {
        if (response.action == "create") {
            user.groups.push(response.group)
            RenderGroups(false, response.group)
        }
        
        if (response.action == "delete") {
            user.groups.splice(user.groups.findIndex(group => group.id == response.id), 1)
            document.getElementById(response.id).remove()
            messageView.innerHTML = ''
            messageView.style.display = "none"
            document.getElementById("messageInput").style.display = "none"
            document.getElementById("messages-placeholder").classList.remove("hidden")
        }
    })

    socket.on("messages", response => {
        for (const group of user.groups) {
            if (group.id == response.groupID) {
                group.messages = response.messages
                if (selectedGroup.id == response.groupID) {
                    switch (response.action) {
                        case "send":
                            RenderMessages(false, false, true, group.messages[group.messages.length - 1])
                            break;
                    
                        case "edit":
                            document.getElementById(response.messageID).innerText = group.messages.find(message => message.id == response.messageID).message
                            break;

                        case "delete":
                            document.getElementById(response.messageID).remove()
                            break;
                    }
                    break
                }
            }
        }
    })

    socket.on("error", response => {
        alert(response.error)
        window.location.href = "/"
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

function OpenModal(e) {
    const bg = document.getElementById("background")
    bg.classList.remove("hidden")
    bg.onclick = () => {
        document.getElementById(`${e.target.id}-modal`).classList.add("hidden")
        bg.classList.add("hidden")
    }
    document.getElementById(`${e.target.id}-modal`).classList.remove("hidden")
}

async function GroupClickHandle(group) {
    if (!selectedGroup || selectedGroup.id != group.id) {
        console.log(group)
        selectedGroup = { ...group, allMessagesLoaded: false }
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
    RenderElements(messageView.id, message => `
        ${message.from.split('-')[1] != user.id ? `<p class="message-header">${message.from}</p>` : '' }
        <p class="message-content">${message.message.length > 200 ? message.message.slice(0, 200) + '...' : message.message}</p>
        ${message.message.length > 200 ? `<span>See more ${message.message.length - 200}</span>` : ''}
        <p class="message-time">${message.date.split(' ')[0] == new Date().toLocaleDateString() ? message.date.split(' ')[1] : message.date}</p>`, 
        clear,
        prepend, 
        (message, e) => {
            if (e.target.tagName != "SPAN") {
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
        }, 
        message => ["message", message.from.split('-')[1] == user.id  ? "user" : null], ...messages)
    
    document.querySelectorAll(".message > span")?.forEach(span => span.addEventListener('click', e => {
        e.target.previousElementSibling.innerText = selectedGroup.messages.find(_message => _message.id ==  e.path[1].id).message
        e.target.remove()
    }))

    if (scroll) messageView.scrollBy(0, messageView.scrollHeight)
}

function RenderGroups(clear, ...groups) { 
    RenderElements("data-view", group => `<span>${group.name}</span><svg viewID="groupConfigs" viewBox="0 0 19 20" width="19" height="20" class=""><path fill="currentColor" d="m3.8 6.7 5.7 5.7 5.7-5.7 1.6 1.6-7.3 7.2-7.3-7.2 1.6-1.6z"></path></svg>`, clear, false, GroupClickHandle, () => ["group"], ...groups)
    groups.forEach(group => document.getElementById(group.id).children[1].addEventListener('click', e => {
        const menu = document.getElementById("groupConfigs-view")
        menu.innerHTML = ''
        const li = document.createElement("li")
        li.id = group.owner == user.id ? "delete" : "leave"
        li.innerText = group.owner == user.id ? "Delete" : "Leave"
        menu.style.top = e.pageY + "px"
        menu.style.left = e.pageX + "px"
        menu.appendChild(li)
        menu.onclick = e => {
            if (group.owner != user.id && e.target.id == "delete") return
            socket.emit("group", { id: group.id, action: e.target.id })
        }
    }))
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
