const user = JSON.parse(window.localStorage.getItem("user"))
const authToken = window.localStorage.getItem("token")

document.querySelector("div").innerHTML = `<h1>${user.name}<br/>${authToken}</h1>`