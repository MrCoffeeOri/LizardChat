const info = document.getElementById("info")
const menuS = document.getElementById("menu-selection")

document.querySelectorAll("button.controller").forEach(btn => btn.addEventListener("click", e => {
    e.target.parentElement.setAttribute("currentSlideIndex", e.target.innerText == ">" ? (Number(e.target.parentElement.getAttribute("currentSlideIndex")) + 1) % e.target.parentElement.children[0].children.length : (Number(e.target.parentElement.getAttribute("currentSlideIndex")) - 1 + e.target.parentElement.children[0].children.length) % e.target.parentElement.children[0].children.length)
    for (const slide of e.target.parentElement.children[0].children) {
        slide.style.transform = `translateX(-${100 * Number(e.target.parentElement.getAttribute("currentSlideIndex"))}%)`;
    }
}))
menuS.childNodes.forEach(op => op.addEventListener("click", e => {
    if (e.target.getAttribute("idM") == "sair") {
        window.location.href = "../index.php"
        return
    }
    document.getElementById(e.target.getAttribute("idM")).showModal()
    switch (e.target.getAttribute("idM")) {
        case "coment":

            break;
    
        default:
            break;
    }
}))
document.querySelectorAll("dialog").forEach(dialog => dialog.addEventListener("click", e => e.target.tagName == "DIALOG" && e.target.close()))
document.getElementById("menu").addEventListener("click", e => {
    (e.target.id ? e.target : e.target.parentElement).classList.toggle("change")
    menuS.style.display = (e.target.id ? e.target : e.target.parentElement).classList.contains("change") ? "block" : "none"
})
document.querySelectorAll('.slide-subcontent').forEach(slide => {
    slide.addEventListener("click", e => {
        window.location.href = "./obra.php?obraSource="+e.target.parentElement.children[0].src
    })
})
document.querySelectorAll(".message").forEach(message => message.addEventListener("submit", SubmitHandler))

async function SubmitHandler(e) {
    e.preventDefault()   
    const commentForm = new FormData(e.target)
    commentForm.append("userID", localStorage.getItem("userID"))
    commentForm.append("action", e.submitter.name)
    if (e.submitter.name == "add") e.target[0].value = ''
    const data = await SendCommentAction(commentForm)
    if (e.submitter.name == "add") {
        const div = document.createElement("div")
        div.innerHTML = data
        div.addEventListener("submit", SubmitHandler)
        document.getElementById("coment").children[1].append(div)
    } else if (e.submitter.name == "delete")
        e.target.remove()
}

async function SendCommentAction(commentForm) {
    return await (await fetch("../scripts/comment.php", {
        method: "POST",
        body: commentForm
    })).text()
}