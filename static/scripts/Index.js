const form = document.getElementById("modalForm")
const userAuth = { email: window.localStorage.getItem("email"), password: window.localStorage.getItem("password") }
let showLogin = false

if (userAuth.email && userAuth.password)
    fetch(`/api/user/login/${userAuth.email}/${userAuth.password}`).then(HanleUserAuth)

form.addEventListener("submit", e => {
    e.preventDefault()
    const email = document.getElementById("emailInp").value
    const password = document.getElementById("passwordInp").value
    const name = document.getElementById("nickNamelInp")?.value
    const rPassword = document.getElementById("repeatPasswordInp")?.value
    if (showLogin && (name == ' ' || rPassword != password))
        return ShowInfoMessage("Invalid nickname or password", true)

    showLogin ? 
        fetch(`/api/user/create`, {
            body: JSON.stringify({ name, password, email,}),
            headers:  { "Content-Type": "application/json" },
            method: "POST"
        }).then(HanleUserAuth)
    : 
        fetch(`/api/user/login/${email}/${password}`).then(HanleUserAuth)
    window.localStorage.setItem("email", email)
    window.localStorage.setItem("password", password)
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
        if (!e.ok) {
            window.localStorage.clear()
            return ShowInfoMessage(_e.message, true)
        }
            
        ShowInfoMessage(_e.message)
        setTimeout(() => window.location.href = `/home.html?authToken=${_e.authToken}&userID=${_e.userID}`, 1000)
    })
}

function ShowInfoMessage(message, isError = false) {
    const messageWarning = document.getElementById("warningMessage")
    messageWarning.style.display = "block"
    messageWarning.innerText = message
    messageWarning.style.backgroundColor = isError ? "red" : "var(--second-darken-color-theme)"
}