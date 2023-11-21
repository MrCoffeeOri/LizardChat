import HighContrast from "./contrast.js"

const highContrast = new HighContrast("./img/")
const dialog = document.querySelector("dialog")
const eye = document.getElementById("acc")
let showLogin = true

if (localStorage.getItem("high")) {
    highContrast.Toggle()
    eye.src = "./img/icons/eye2.png"
}

document.querySelector("section:first-of-type button").addEventListener("click", () => document.getElementById("saibaMais").scrollIntoView({ behavior: "smooth" }))
dialog.addEventListener("click", e => e.target.tagName == "DIALOG" && dialog.close())
document.getElementById("access").addEventListener("click", () => dialog.showModal())
eye.addEventListener("click", () => {
    if (localStorage.getItem("high")) {
        localStorage.removeItem("high")
        eye.src = "./img/icons/eye.png"
    } else {
        localStorage.setItem("high", "true")
        eye.src = "./img/icons/eye2.png"
    }
    highContrast.Toggle()
})
dialog.children[0].children[2].addEventListener("click", e => {
    showLogin = !showLogin
    dialog.children[0].children[2].innerText = showLogin ? "Acessar Conta" : "Criar Conta"
    dialog.children[0].children[1].value = dialog.children[0].children[2].innerText
    dialog.children[0].children[1].name = showLogin ? "login" : "logon"
    dialog.children[0].children[0].innerHTML = showLogin ?
    `  
        <label for="login">Email:</label>
        <input required type="text" id="email" name="email" placeholder="Entre com seu email">
        <label for="senha">Senha:</label>
        <input required type="password" id="senha" name="senha" placeholder="Entre com sua senha">
    `
    :
    `
        <label for="nome">Nome Completo:</label>
        <input required type="text" id="nome" name="nome" placeholder="Entre com seu nome completo">
        <label for="nick"> Nick (Nome de Usuário): </label>
        <input required type="text" id="nick"name="nick" placeholder="Entre com o nome de seu usuário"> 
        <label for="email">E-mail:</label>
        <input required type="email" id="email" name="email" placeholder="Entre com o seu email">
        <label for="senha">Senha:</label>
        <input required type="password" id="senha" name="senha" placeholder="Entre com uma senha de no mínimo 8 caracteres, contendo pelo menos um simbolo e um número">
        <label for="telefone">Telefone:</label>
        <input required type="tel" id="telefone" name="telefone" placeholder="Entre com o seu telefone. Formato: (99) 99999-9999">
        <label for="cidade"> Cidade:</label>
        <input required type="text" id="cidade" name="cidade" placeholder="Entre com a cidade que mora">
        <label for="fotoUser"> Foto de Usuário:</label>
        <input required type="file" id="fotoUser" name="fotoUser" placeholder="Insira uma foto para o Usuário (Ex:.jpg, .png, .tiff, entre outros)" accept="image/*">
    `
    e.target.innerText = showLogin ? "Criar conta" : "Voltar ao login"
})