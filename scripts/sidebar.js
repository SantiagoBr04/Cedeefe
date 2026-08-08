/* CONTROLE DA SIDEBAR */
function iniciarSidebar() {
    const btn = document.querySelector("#btn-menu");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.querySelector(".overlay");

    if (!sidebar) return;

    // Toggle ao clicar no botão de menu (#btn-menu)
    if (btn) {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("expandido");

            if (window.innerWidth <= 991 && overlay) {
                overlay.classList.toggle("ativo");
            }
        });
    }

    // Expande a sidebar ao clicar em qualquer item/ícone se ela estiver fechada
    sidebar.addEventListener("click", (e) => {
        // Se a sidebar estiver colapsada, expande ao clicar num ícone/item
        if (!sidebar.classList.contains("expandido")) {
            sidebar.classList.add("expandido");

            if (window.innerWidth <= 991 && overlay) {
                overlay.classList.add("ativo");
            }
        }
    });

    if (overlay) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("expandido");
            overlay.classList.remove("ativo");
        });
    }

    window.addEventListener("resize", () => {
        if (window.innerWidth > 991 && overlay) {
            overlay.classList.remove("ativo");
        }
    });
}