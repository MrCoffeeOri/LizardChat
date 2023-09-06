const form = document.getElementById("modalForm")
const userAuth = { email: window.localStorage.getItem("email"), password: window.localStorage.getItem("password") }
let showLogin = false

if (userAuth.email && userAuth.password)
    fetch(`/api/user/login/${userAuth.email}/${userAuth.password}`).then(HanleUserAuth)

form.addEventListener("submit", e => {
    e.preventDefault()
    ShowInfoMessage("Processing request...", "blue")
    const name = document.getElementById("nickNamelInp")?.value
    const email = document.getElementById("emailInp").value
    const password = document.getElementById("passwordInp").value
    if (showLogin && (name == ' ' || document.getElementById("repeatPasswordInp")?.value != password))
        return ShowInfoMessage("Invalid nickname or password", "red")

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
        <div>
            <label for="emailInp">Email</label>
            <input placeholder=" " required type="email" id="emailInp" />
        </div>
        <div>
            <label for="passwordInp">Password</label>
            <input placeholder=" " required type="password" id="passwordInp" />
        </div>
        <button>Login</button>
    `
    :
    `
        <div>
            <label for="emailInp">Email</label>
            <input placeholder=" " required type="email" id="emailInp">
        </div>
        <div>
            <label for="passwordInp">Password</label>
            <input placeholder=" " required type="password" id="passwordInp">
        </div>
        <div>
            <label for="repeatPasswordInp">Repeat password</label>
            <input placeholder=" " required type="password" id="repeatPasswordInp">
        </div>
        <div>
            <label for="nickNamelInp">Nickname</label>
            <input placeholder=" " required type="text" id="nickNamelInp">
        </div>
        <div>
            <label for="nickNamelInp">Image</label>
            <img src />
            <input required accept="image/png,image/jpeg,image/webp" type="file" id="">
        </div>
        <button>Create account</button>
    `
    e.target.innerText = showLogin ? "Create an account" : "Back to login"
    showLogin = !showLogin
})

function HanleUserAuth(e) {
    e.json().then(_e => {
        !e.ok && window.localStorage.clear()
        ShowInfoMessage(_e.message || _e.error, e.ok ? "var(--second-darken-color-theme)" : "red")
        if (_e.userUID && _e.authToken) window.location.href = `/home.html?authToken=${_e.authToken}&userID=${_e.userUID}`
    })
}

function ShowInfoMessage(message, color) {
    const messageWarning = document.getElementById("warningMessage")
    messageWarning.style.display = "block"
    messageWarning.innerText = message
    messageWarning.style.backgroundColor = color
}