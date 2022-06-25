const form = document.getElementById("modalForm")
const token = window.localStorage.getItem("token")
let showLogin = false

if (token) fetch(`/api/user/login/${token}`).then(HanleUserAuth)

form.addEventListener("submit", e => {
    e.preventDefault()
    const email = document.getElementById("emailInp").value
    const password = document.getElementById("passwordInp").value
    const name = document.getElementById("nickNamelInp")?.value
    const rPassword = document.getElementById("repeatPasswordInp")?.value
    if (showLogin && (name == ' ' || rPassword != password))
        return ShowWarning("Invalid nickname or password")

    showLogin ? 
        fetch(`/api/user/create`, {
            body: JSON.stringify({ name, password, email,}),
            headers:  { "Content-Type": "application/json" },
            method: "POST"
        }).then(HanleUserAuth)
    : 
        fetch(`/api/user/login/${email}/${password}`).then(HanleUserAuth)
})

document.getElementById("modal").children[2].addEventListener("click", e => {
    form.innerHTML = showLogin ?
    `
        <input required type="email" id="emailInp" placeholder="Email"/>
        <input required type="password" id="passwordlInp" placeholder="Password"/>
        <button>Login</button>
    `
    :
    `
        <input required type="email" id="emailInp" placeholder="Email">
        <input required type="password" id="passwordInp" placeholder="Password">
        <input required type="password" id="repeatPasswordInp" placeholder="Repeat password">
        <input required type="text" id="nickNamelInp" placeholder="Nickname">
        <button>Create account</button>
    `
    e.target.innerText = showLogin ? "Create an account" : "Back to login"
    showLogin = !showLogin
})

function HanleUserAuth(e) {
    e.json().then(_e => {
        if (!e.ok)
            return ShowWarning(_e.message)
            
        window.localStorage.setItem("token", _e.authToken)
        window.localStorage.setItem("user", JSON.stringify(_e.user))
        ShowWarning(_e.message)
        setTimeout(() => window.location.href = "/User.html", 1000)
    })
}

function ShowWarning(message) {
    const messageWarning = document.getElementById("warningMessage")
    messageWarning.innerText = message
    messageWarning.style.display = "block"
}