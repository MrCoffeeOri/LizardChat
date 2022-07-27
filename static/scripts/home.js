const aside = document.querySelector('aside')
const main = document.querySelector('main')


/*import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

const socket = io("http://localhost:5000", { 
    auth: { 
        token: new URLSearchParams(window.location.search).get('authToken'), 
        userID: new URLSearchParams(window.location.search).get('userID') 
    } 
})
let user = null

socket.on("connect", () => {
    socket.on("user", response => { 
        user = response
        document.querySelector("div").innerHTML = `<h1>${user.name}<br/>${user.authToken}</h1>`
    })

    socket.on("error", response => {
        document.querySelector("div").innerHTML = `<h1>${response.error}</h1>`
    })

    socket.on("disconnect", () => {
        user = null
        document.querySelector("div").innerHTML = `<h1>Disconnected</h1>`
    })
})
*/