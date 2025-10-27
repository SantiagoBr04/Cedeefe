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
  // Previne o comportamento padrão do formulário (que é recarregar a página)
  event.preventDefault();

  // Captura os valores dos campos do formulário
  const quantidade = document.querySelector('.nQuest').value;
  const disciplinaSelecionada = document.querySelector('select[name="disciplina"]').value;

  // Aqui é provisorio, tenho que fazer a logica para pegar as disciplinas que tem e colocar
  // automaticamente, ao inves de colocar aqui
  const disciplinasCod = {
      matematica: 1,
      portugues: 2,
      geografia: 3,
      // Outros codigos conforme Banco de dados
  };
  const disciplinaCod = disciplinasCod[disciplinaSelecionada];

  // Validação básica
  if (!quantidade || !disciplinaCod) {
    alert('Por favor, preencha a quantidade de questões e a disciplina.');
    return;
  }

  // Monta o corpo da requisição para a API
  const corpoRequisicao = {
    quantidade: parseInt(quantidade), // Garante que é um número
    disciplinas: [disciplinaCod]      // A API espera um array de códigos
  };

  try {
    // Faz a chamada para a API usando fetch() (modo padrão para chamar API)
    // O usuario tem que estar logado, para enviar o token
    const token = localStorage.getItem('jwt_token'); // Exemplo de como pegar o token

    if (!token) {
        alert('Você precisa estar logado para criar uma lista!');
        // Redireciona para a página de login
        window.location.href = 'login.html';
        return;
    }

    // Vai enviar os dados para a API
    const resposta = await fetch('http://localhost:3000/api/listas/gerar', {
      method: 'POST', // Determina o metodo da chamada
      headers: {
        'Content-Type': 'application/json', // Diz o tipo de dado, JSON nesse caso
        'Authorization': `Bearer ${token}` // Envia o token para o authMiddleware
      },
      body: JSON.stringify(corpoRequisicao) // Converte os dados para JSON, que é padrão
    });

    const questoesGeradas = await resposta.json(); // Espera a resposta e guarda na variavel

    // Verifica se a resposta da API foi um erro
    if (!resposta.ok) {
      // Usa a mensagem de erro que o backend enviou
      throw new Error(questoesGeradas.error || 'Erro ao gerar a lista de questões.');
    }

    // Se tudo deu certo, salva as questões no localStorage
    localStorage.setItem('listaDeQuestoes', JSON.stringify(questoesGeradas));

    // Redireciona o usuário para a página de fazer a lista
    window.location.href = 'fazendoLista.html';

  } catch (error) { // Catch, serve para se o try der erro
    console.error('Falha na requisição:', error);
    alert(error.message);
  }
});