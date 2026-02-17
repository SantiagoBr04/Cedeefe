// Função para buscar as disciplinas na API e preencher o menu dropdown
async function carregarDisciplinas() {
  // Pega a referência ao elemento <select> no HTML usando o ID que definimos.
  const selectElement = document.querySelector('#disciplina-select');

  try {
    // Faz a chamada fetch para a nova API. Como é um GET, não precisa de muitas opções.
    const resposta = await fetch('http://localhost:3000/api/disciplinas');

    // Se a resposta da API não for bem-sucedida, lança um erro.
    if (!resposta.ok) {
      throw new Error('Falha ao carregar as disciplinas.');
    }

    const disciplinas = await resposta.json();

    // Limpa o <select> (remove a opção "Carregando...").
    selectElement.innerHTML = '';

    // Adiciona uma primeira opção padrão para instruir o usuário.
    const defaultOption = document.createElement('option');
    defaultOption.value = ''; // Valor vazio para que não seja selecionável
    defaultOption.textContent = 'Selecione uma disciplina';
    selectElement.appendChild(defaultOption);

    // Faz um loop (forEach) no array de disciplinas que recebemos do backend.
    disciplinas.forEach(disciplina => {
      // Para cada disciplina no array...

      // Cria um novo elemento <option> do zero.
      const option = document.createElement('option');

      // Define o 'value' do <option> para ser o 'cod' da disciplina.
      // Isso é o que será enviado para o backend quando o formulário for submetido.
      option.value = disciplina.cod;

      // Define o texto visível do <option> para ser a 'descricao'.
      // Isso é o que o usuário vê na lista.
      option.textContent = disciplina.descricao;

      // Adiciona o <option> recém-criado dentro do <select>.
      selectElement.appendChild(option);
    });

  } catch (error) {
    console.error('Erro:', error);
    // Se der erro, mostra uma mensagem de falha no próprio dropdown.
    selectElement.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

// Garante que a função carregarDisciplinas seja executada assim que o HTML da página for carregado.
document.addEventListener('DOMContentLoaded', carregarDisciplinas);

// Adiciona um ouvinte ao formulário para pegar o envio
document.querySelector('.criarLista').addEventListener('submit', async function(event) {
  event.preventDefault();

  const nome = document.querySelector('.nome').value;
  const descricao = document.querySelector('.descricao').value;
  const quantidade = document.querySelector('.nQuest').value;
  const disciplinaCod = document.querySelector('#disciplina-select').value; 

  if (!quantidade || disciplinaCod === '') {
    alert('Por favor, preencha a quantidade de questões e a disciplina.');
    return;
  }

  const corpoRequisicao = {
    nome: nome, 
    descricao: descricao, 
    disciplina_cod: disciplinaCod,
    quantidade: parseInt(quantidade), 
    disciplinas: [disciplinaCod]     
  };

  try {
    const token = localStorage.getItem('jwt_token'); 

    if (!token) {
        alert('Você precisa estar logado para criar uma lista!');
        window.location.href = 'login.html';
        return;
    }

    // Faz a chamada para a API
    const resposta = await fetch('http://localhost:3000/api/listas/gerar', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(corpoRequisicao) 
    });

    const resultado = await resposta.json(); 

    if (!resposta.ok) {
      throw new Error(resultado.error || 'Erro ao gerar a lista de questões.');
    }
    
    // Salva o ID da atividade (para usar depois se precisar)
    localStorage.setItem('atividadeAtualID', resultado.atividade_cod); //

    // Salva APENAS o array de questões na chave que o fazendoLista.js espera
    localStorage.setItem('listaDeQuestoes', JSON.stringify(resultado.questoes)); //

    // Redireciona
    window.location.href = 'fazendoLista.html';

  } catch (error) { 
    console.error('Falha na requisição:', error);
    alert(error.message);
  }
});
