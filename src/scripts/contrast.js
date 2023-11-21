export default class HighContrast {
    constructor(backgroundImagePath) {
        this.backgroundImagePath = backgroundImagePath
        this.memo = []
    }

    Toggle() {
        const elements = document.querySelectorAll("*")
        for (let i = 0; i < elements.length; i++) {
            if (this.memo.length != elements.length) this.memo[i] = { border: elements[i].style.border, backgroundColor: elements[i].style.backgroundColor, boxShadow: elements[i].style.boxShadow} 
            elements[i].style.color = elements[i].style.color == "rgb(247, 233, 136)" ? "" : "rgb(247, 233, 136)"
            if ((elements[i].tagName == "SECTION" || elements[i].tagName == "BUTTON" || elements[i].classList.contains("balao") || elements[i].tagName == "FOOTER" || elements[i].tagName == "FORM" || elements[i].tagName == "INPUT" || elements[i].classList.contains("coment")) && elements[i].id != "init") {
                elements[i].style.backgroundColor = elements[i].style.backgroundColor == "black" ? this.memo[i].backgroundColor : "black"
                elements[i].style.border =  elements[i].style.border == "2px solid rgb(247, 233, 136)" ? this.memo[i].border : "2px solid rgb(247, 233, 136)"
            }

            if(elements[i].tagName === "DIALOG" || elements[i].className == "coment"){
              elements[i].style.boxShadow = elements[i].style.boxShadow== "10px 10px rgb(247,233,136)" ? this.memo[i].boxShadow : "10px 10px rgb(247,233,136)"
            }

        }
        console.log(this.memo)
        document.body.style.backgroundImage = `url(${this.backgroundImagePath}${document.body.style.backgroundImage.includes("background-image-lwrRes-2.webp") || document.body.style.backgroundImage == "" ? "background-image-lwrRes-2-black.jpeg" : "background-image-lwrRes-2.webp"})`
    }
}