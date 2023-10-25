const form = document.getElementById("modalForm")
const fileReader = new FileReader()
const userAuth = { email: window.localStorage.getItem("email"), password: window.localStorage.getItem("password") }
let showLogin = false, image = null

if (userAuth.email && userAuth.password)
    fetch(`/api/user/login/${userAuth.email}/${userAuth.password}`).then(res => res.json()).then(data => data.message == "Invalid login" ? ShowInfoMessage(data.message, "red") : window.location.href = `/home.html?authToken=${data.authToken}&userID=${data.uid}`)

form.addEventListener("submit", async e => {
    e.preventDefault()
    ShowInfoMessage("Processing request...", "blue")
    const name = document.getElementById("nickNamelInp")?.value
    const email = document.getElementById("emailInp").value
    const password = document.getElementById("passwordInp").value
    if (showLogin && (name == ' ' || document.getElementById("repeatPasswordInp")?.value != password)) return ShowInfoMessage("Invalid nickname or password", "red")
    if (showLogin && image == null) return ShowInfoMessage("Failed to read image", "red")
    const response = await fetch(showLogin ? "/api/user/create" : `/api/user/login/${email}/${password}`, showLogin ? { body: JSON.stringify({ name, password, email, image: (await (await fetch(`/api/upload/`, { method: "POST", headers: { 'Content-Type': 'application/json', 'Content-Length': image.length }, body: JSON.stringify({ fileURL: image, fileType: ".webp" }) })).json()).filePath }), headers:  { "Content-Type": "application/json" }, method: "POST" } : null)
    const data = await response.json()
    !response.ok && window.localStorage.clear()
    ShowInfoMessage(data.message || data.error, response.ok ? "var(--second-darken-color-theme)" : "red")
    if (data.uid && data.authToken) window.location.href = `/home.html?authToken=${data.authToken}&userID=${data.uid}`
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
        <div id="imageDisplay">
            <label for="nickNamelInp">Image</label>
            <img id="userImage" src="./assets/default.webp"/>
            <input style='display: none;' required accept="image/png,image/jpeg,image/webp" type="file" id="userImageInput">
        </div>
        <button>Create account</button>
    `
    if (!showLogin) {
        const userImageInput = document.getElementById("userImageInput")
        userImageInput.addEventListener("input", () => {
           fileReader.onloadend = async e => { 
               image = e.target.result 
               document.getElementById("userImage").src = image
           }
           fileReader.readAsDataURL(userImageInput.files[0])
       })
       document.getElementById("userImage").addEventListener("click", () => userImageInput.click())
    }
    e.target.innerText = showLogin ? "Create an account" : "Back to login"
    showLogin = !showLogin
})

function ShowInfoMessage(message, color) {
    const messageWarning = document.getElementById("warningMessage")
    messageWarning.style.display = "block"
    messageWarning.innerText = message
    messageWarning.style.backgroundColor = color
}