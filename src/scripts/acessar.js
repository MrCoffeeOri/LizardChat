const form = document.getElementById("mainForm") 
let showLogin = true

form.children[1].addEventListener("click", e => {
    showLogin = !showLogin
    form.children[0].innerHTML = showLogin ?
    `
        <label for="login">Email:</label>
        <input required type="text" id="email" name="email" placeholder="Entre com seu email"><br><br>
        <label for="senha">Senha:</label>
        <input required type="password" id="senha" name="senha" placeholder="Entre com sua senha"><br><br>
        <input type="submit" value="Acessar Conta">
    `
    :
    `
        <label for="nome">Nome Completo:</label>
        <input required type="text" id="nome" name="nome" placeholder="Entre com seu nome completo"><br><br>
        <label for="email">E-mail:</label>
        <input required type="email" id="email" name="email" placeholder="Entre com o seu email"><br><br>
        <label for="senha">Senha:</label>
        <input required type="password" id="senha" name="senha" placeholder="Entre com uma senha de no mínimo 8 caracteres, contendo pelo menos um simbolo e um número"><br><br>
        <input type="submit" value="Criar conta">
    `
    e.target.innerText = showLogin ? "Criar conta" : "Voltar ao login"
})