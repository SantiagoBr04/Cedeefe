fetch("../componentes/sidebar.html")
    .then(response => response.text())
    .then(data => {
        document.getElementById("sidebar-container").innerHTML = data;

        iniciarSidebar();

        const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
        if (token) {
            const btnUserLink = document.getElementById("btn-user-link");
            if (btnUserLink) {
                btnUserLink.href = "perfilUsuario.html";
            }
        }
    });  