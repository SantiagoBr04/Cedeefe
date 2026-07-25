 /*BOTÃO MENU*/
function iniciarSidebar() {
const btn = document.querySelector("#btn-menu");
const sidebar = document.querySelector(".sidebar");
const overlay = document.querySelector(".overlay");

btn.addEventListener("click", () => {
    sidebar.classList.toggle("expandido");

    if(window.innerWidth <= 991){
        overlay.classList.toggle("ativo");
    }
});

overlay.addEventListener("click", () => {
    sidebar.classList.remove("expandido");
    overlay.classList.remove("ativo");
});

window.addEventListener("resize", () => {

    if(window.innerWidth > 991){
        overlay.classList.remove("ativo");
    }

});

}