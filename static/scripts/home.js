import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

const socket = io(window.location.host, { 
    auth: { 
        token: new URLSearchParams(window.location.search).get('authToken'), 
        userID: new URLSearchParams(window.location.search).get('userID') 
    } 
})
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

document.querySelector("#search > div > input").addEventListener('input', (e) => document.querySelector("#search > div > svg").style.display = e.target.value.length > 0 ? "block" : "none")
document.querySelector("#search > svg").addEventListener('click', () => ShowUniqueElement("#search > ul", "#info-view > ul"))
document.querySelector("#info-view > svg").addEventListener('click', () => ShowUniqueElement("#info-view > ul", "#search > ul"))

document.querySelectorAll("#info-view > ul > li").forEach(li => li.addEventListener('click', e => {
    const bg = document.getElementById("background")
    bg.classList.remove("hidden")
    bg.onclick = () => {
        document.getElementById(`${e.target.id}Modal`).classList.add("hidden")
        bg.classList.add("hidden")
    }
    document.querySelector("#info-view > ul").classList.add("hidden")
    document.getElementById(`${e.target.id}Modal`).classList.remove("hidden")
}))

document.querySelectorAll("#search > ul > li").forEach(li => li.addEventListener('click', (e) => {
    document.querySelector(`#search > ul > li.selected`)?.classList.remove("selected")
    document.querySelector(`#search > ul`).classList.toggle("hidden")
    e.target.classList.add("selected")
    document.querySelector("#search > div > input").placeholder = 'Search using filter: ' + e.target.innerText
}))

document.querySelector("#messageInput > input").addEventListener('input', (e) => {
    if (e.target.value == '' || e.target.value == ' ' || e.target.value == undefined || e.target.value == null)
        document.querySelector("#messageInput > img").classList.add("hidden")
    else
        document.querySelector("#messageInput > img").classList.remove("hidden")
})

socket.on("connect", () => {
    document.getElementById("newGroupForm").addEventListener('submit', (e) => {
        e.preventDefault()
        const name = e.target[0].value, description = e.target[1].value;
        socket.emit('group', { name, description, action: "create" })
        document.getElementById("newGroupModal").classList.add("hidden")
        document.getElementById("background").classList.add("hidden")
        e.target[0].value = ""
        e.target[1].value = ""
    })
    
    socket.on("user", response => { 
        console.log(response)
        user = response
        document.getElementById("userName").innerText = user.name
        user.groups.forEach(group => {
            document.getElementById("group-view").innerHTML += 
            `
                <div id="${group.id}" class="group">
                    <span>${group.name}</span>
                        ${group.messages.length > 0 ? `<br><div><span>${group.messages[0].date}</span><span>${group.messages[0].message}</span></div>` : ''}
                </div>
            `
        })
        const groups = document.querySelectorAll(".group")
        groups.length > 0 && groups.forEach(group => group.addEventListener('click', (e) => {
            document.getElementById("messages-placeholder").classList.add("hidden")
            document.getElementById("messages-view").classList.remove("hidden")
            document.getElementById("messageInput").style.display = "flex"
            user.groups.find(group => group.id == e.target.id)?.messages.forEach(message => {
                document.getElementById("messages-view").innerHTML += 
                `
                    <div id="${message.id}" class="message ${message.from == user.id && "user"}">
                        <span>${message.from}</span>
                        <span>${message.message}</span>
                    </div>
                `
            })
        }))
    })

    socket.on("groupEvent", response => {
        if (response.action == "create") {
            user.groups.push(response.group)
            console.log(response)
            document.getElementById("group-view").innerHTML +=
            `
                <div id="${response.group.id}" class="group">
                    <span>${response.group.name}</span><br>
                    <div>
                        <span>${response.group.messages[0].date}</span>
                        <span>${response.group.messages[0].message}</span>
                    </div>
                </div>
            `
        }
    })

    socket.on("error", () => window.location.href = "/")

    socket.on("disconnect", () => {
        user = null
        window.location.href = "/disconnected.html"
    })
})

/*document.querySelector('aside > #info-view > div > img').addEventListener('click', () => {
 // Config modal
})


document.querySelector("#messageInput > input").addEventListener('focusout', (e) => {
    if (document.querySelector("#messageInput > input").value == "")
        document.querySelector("#messageInput > img").classList.add("hidden")
})*/

function ShowUniqueElement(source, other) {
    document.querySelector(other).classList.add("hidden")
    document.querySelector(source).classList.toggle("hidden")
}