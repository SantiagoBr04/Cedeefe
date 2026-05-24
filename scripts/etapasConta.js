function mostrarEtapa(etapaAtual) {

    // Esconde todas
    document.getElementById("etapa1").style.display = "none";
    document.getElementById("etapa2").style.display = "none";
    document.getElementById("etapa3").style.display = "none";

    // Mostra a etapa atual
    document.getElementById(etapaAtual).style.display = "block";
}


// Ir para etapa 2
function proximaPagina1() {
    mostrarEtapa("etapa2");
}


// Voltar para etapa 1
function voltarPagina1() {
    mostrarEtapa("etapa1");
}


// Ir para etapa 3
function proximaPagina2() {
    mostrarEtapa("etapa3");
}


// Voltar para etapa 2
function voltarPagina2() {
    mostrarEtapa("etapa2");
}