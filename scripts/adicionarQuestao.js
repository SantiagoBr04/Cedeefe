// Carregar Disciplinas ao abrir a página
async function carregarDisciplinas() {
    const select = document.getElementById('disciplina-select');
    try {
        const response = await fetch('http://localhost:3000/api/disciplinas');
        if (!response.ok) throw new Error('Erro ao buscar disciplinas');
        
        const disciplinas = await response.json();
        
        select.innerHTML = '<option value="">Selecione...</option>';
        disciplinas.forEach(d => {
            const option = document.createElement('option');
            option.value = d.cod;
            option.textContent = d.descricao;
            select.appendChild(option);
        });
    } catch (err) {
        console.error(err);
        select.innerHTML = '<option>Erro ao carregar</option>';
    }
}

document.addEventListener('DOMContentLoaded', carregarDisciplinas);

// Lógica de Envio do Formulário
document.getElementById('form-add-questao').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Pegar token (Admin precisa estar logado)
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        alert("Você precisa estar logado!");
        window.location.href = "login.html";
        return;
    }

    // Coletar dados básicos
    const enunciado = document.getElementById('enunciado').value;
    const disciplinaCod = document.getElementById('disciplina-select').value;
    const temaCod = document.getElementById('tema-input').value;
    const autor = document.getElementById('autor-input').value;       
    const ano = document.getElementById('ano-input').value;           
    const explicacao = document.getElementById('explicacao').value;
    const arquivoImagem = document.getElementById('input-imagem').files[0];

    // Coletar e montar as Alternativas
    const alternativas = [];
    const grupos = document.querySelectorAll('.grupo-alternativa');
    let algumaCorreta = false;

    grupos.forEach(grupo => {
        const texto = grupo.querySelector('.input-texto').value;
        const isCorreta = grupo.querySelector('.radio-correta').checked;
        
        if (texto.trim() !== "") { // Ignora alternativas em branco se quiser
            alternativas.push({
                texto: texto,
                correta: isCorreta
            });
        }
        if (isCorreta) algumaCorreta = true;
    });

    // Validações no Frontend
    if (!disciplinaCod) return alert("Selecione uma disciplina!");
    if (!algumaCorreta) return alert("Selecione qual alternativa é a correta!");
    if (alternativas.length < 2) return alert("Crie pelo menos 2 alternativas!");

    // Montagem do formdata
    const formData = new FormData();
    
    formData.append('descricao', enunciado); // Backend espera 'descricao'
    formData.append('disciplina_cod', disciplinaCod);
    formData.append('ano', ano);
    formData.append('autor', autor);
    formData.append('explicacao', explicacao);
    if (temaCod) formData.append('tema_cod', temaCod);
    
    // Transforma o array de objetos em STRING para o FormData aceitar
    formData.append('alternativas', JSON.stringify(alternativas));

    // Só adiciona a imagem se existir
    if (arquivoImagem) {
        formData.append('imagem', arquivoImagem);
    }

    // Envio
    try {
        const response = await fetch('http://localhost:3000/api/questoes', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}` 
            },
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            alert("Questão criada com sucesso! Código: " + result.cod);
            // Limpa o formulário para a próxima
            document.getElementById('form-add-questao').reset();
        } else {
            throw new Error(result.error || "Erro desconhecido");
        }

    } catch (error) {
        alert("Erro ao salvar: " + error.message);
        console.error(error);
    }
});