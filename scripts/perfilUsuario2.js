document.addEventListener("DOMContentLoaded", () => {

    const usuario = {
        nomeCompleto: "Karen Santos",
        dataNascimento: "2008-09-15",
        genero: "Feminino",
        escola: "IFC - Campus Sombrio",
        login: "karen@email.com",
        motivacao: "Quero estudar para passar no PartiuIF e organizar meus estudos.",
        foto: null
    };

    const formPerfil = document.getElementById("formPerfil");
    const formSenha = document.getElementById("formSenha");
    const perfilAvatar = document.getElementById("perfilAvatar");
    const fotoPerfil = document.getElementById("fotoPerfil");

    function carregarPerfil(){

        document.getElementById("nomeCompleto").value = usuario.nomeCompleto;
        document.getElementById("dataNascimento").value = usuario.dataNascimento;
        document.getElementById("escola").value = usuario.escola;
        document.getElementById("email").value = usuario.login;
        document.getElementById("motivacao").value = usuario.motivacao;

        const radio = document.querySelector(
            `input[name="genero"][value="${usuario.genero}"]`
        );

        if(radio) radio.checked = true;

        if(usuario.foto){

            perfilAvatar.textContent = "";
            perfilAvatar.style.backgroundImage = `url(${usuario.foto})`;
            perfilAvatar.style.backgroundSize = "cover";
            perfilAvatar.style.backgroundPosition = "center";

        }else{

            perfilAvatar.style.backgroundImage = "";
            perfilAvatar.textContent =
                usuario.nomeCompleto.charAt(0).toUpperCase();

        }

    }

    carregarPerfil();

    formPerfil.addEventListener("submit",(e)=>{

        e.preventDefault();

        usuario.nomeCompleto =
            document.getElementById("nomeCompleto").value;

        usuario.dataNascimento =
            document.getElementById("dataNascimento").value;

        usuario.escola =
            document.getElementById("escola").value;

        usuario.motivacao =
            document.getElementById("motivacao").value;

        const genero =
            document.querySelector("input[name='genero']:checked");

        usuario.genero = genero ? genero.value : "";

        alert("Perfil salvo com sucesso! (Mock)");

        console.log(usuario);

        carregarPerfil();

    });

    document
        .getElementById("salvarSenhaBtn")
        .addEventListener("click",()=>{

            const atual =
                document.getElementById("senhaAtual").value;

            const nova =
                document.getElementById("novaSenha").value;

            const confirmar =
                document.getElementById("confirmarSenha").value;

            if(!atual || !nova || !confirmar){

                alert("Preencha todos os campos.");

                return;

            }

            if(nova !== confirmar){

                alert("As senhas não conferem.");

                return;

            }

            alert("Senha alterada! (Mock)");

            formSenha.reset();

            bootstrap.Modal.getInstance(
                document.getElementById("modalSenha")
            ).hide();

        });

    document
        .getElementById("cancelarBtn")
        .addEventListener("click",()=>{

            carregarPerfil();

            alert("Alterações descartadas.");

        });

    document
        .getElementById("excluirContaBtn")
        .addEventListener("click",()=>{

            const senha =
                document.getElementById("senhaExclusao").value;

            if(!senha){

                alert("Digite sua senha.");

                return;

            }

            if(confirm("Deseja realmente excluir a conta?")){

                alert("Conta excluída! (Mock)");

            }

        });

    fotoPerfil.addEventListener("change",(e)=>{

        const arquivo = e.target.files[0];

        if(!arquivo) return;

        const leitor = new FileReader();

        leitor.onload = function(ev){

            usuario.foto = ev.target.result;

            carregarPerfil();

            alert("Foto atualizada! (Mock)");

        }

        leitor.readAsDataURL(arquivo);

    });

});