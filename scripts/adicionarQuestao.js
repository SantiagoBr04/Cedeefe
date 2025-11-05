// Adiciona um ouvinte de evento para garantir que o DOM esteja carregado
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-add-questao'); 
  const alternativasContainer = document.getElementById('alternativas-container'); 
  const btnAddAlternativa = document.getElementById('btn-add-alternativa'); 
  const messageContainer = document.getElementById('message-container'); 
  const disciplinaSelect = document.getElementById('disciplina'); 
  const temaSelect = document.getElementById('tema'); 

  // Cria um contador de alternativas que começa em 0
  let alternativaCount = 0;

  // Função para adicionar um novo campo de alternativa
  const adicionarAlternativa = () => {
    alternativaCount++;
    const alternativaId = `alt-texto-${alternativaCount}`;
    const radioName = 'alternativaCorreta';

    const div = document.createElement('div');
    div.classList.add('alternative-item');
    div.innerHTML = `
      <input type="radio" name="${radioName}" value="${alternativaId}" required>
      <input type="text" class="form-input" id="${alternativaId}" placeholder="Texto da alternativa ${alternativaCount}" required>
    `;
    alternativasContainer.appendChild(div);
  };

  // Adiciona 4 campos de alternativa ao carregar a página
  for (let i = 0; i < 4; i++) {
    adicionarAlternativa();
  }

  // Evento para o botão de adicionar mais alternativas
  btnAddAlternativa.addEventListener('click', adicionarAlternativa);

  // Evento de submit do formulário
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageContainer.innerHTML = ''; // Limpa mensagens antigas

    // Coleta dos dados do formulário
    const descricao = document.getElementById('descricao').value;
    const autor = document.getElementById('autor').value;
    const ano = document.getElementById('ano').value;
    const explicacao = document.getElementById('explicacao').value;
    const imagem_url = document.getElementById('imagem_url').value;
    const disciplina_cod = disciplinaSelect.value;
    const tema_cod = temaSelect.value;

    // Validação dos campos obrigatórios
    if (!descricao || !disciplina_cod) {
        showMessage('Descrição e Disciplina são campos obrigatórios.', 'danger');
        return;
    }

    // Coleta das alternativas
    const alternativaCorretaRadio = document.querySelector('input[name="alternativaCorreta"]:checked');
    if (!alternativaCorretaRadio) {
        showMessage('Por favor, marque uma alternativa como correta.', 'danger');
        return;
    }
    const idCorreta = alternativaCorretaRadio.value;

    const alternativasInputs = alternativasContainer.querySelectorAll('.form-input');
    const alternativas = Array.from(alternativasInputs).map(input => ({
      texto: input.value,
      correta: input.id === idCorreta
    })).filter(alt => alt.texto.trim() !== ''); // Filtra alternativas vazias

    if (alternativas.length < 2) {
        showMessage('É necessário adicionar pelo menos duas alternativas.', 'danger');
        return;
    }
    
    // Monta o objeto para enviar para a API
    const dadosQuestao = {
      descricao,
      disciplina_cod: parseInt(disciplina_cod),
      alternativas,
      // Adiciona campos opcionais apenas se tiverem valor
      ...(autor && { autor }),
      ...(ano && { ano: parseInt(ano) }),
      ...(explicacao && { explicacao }),
      ...(imagem_url && { imagem_url }),
      ...(tema_cod && { tema_cod: parseInt(tema_cod) }),
    };

    try {
        const token = sessionStorage.getItem('authToken');
        if (!token) {
            throw new Error('Você não está autenticado. Faça login para adicionar uma questão.');
        }

        const response = await fetch('http://localhost:3000/api/questoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Envia o token de autenticação
            },
            body: JSON.stringify(dadosQuestao)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Falha ao adicionar a questão.');
        }

        showMessage('Questão adicionada com sucesso!', 'success');
        form.reset(); // Limpa o formulário
        // Limpa e recria os campos de alternativa
        alternativasContainer.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            adicionarAlternativa();
        }

    } catch (error) {
        showMessage(error.message, 'danger');
        console.error('Erro ao salvar questão:', error);
    }
  });

  // Função para exibir mensagens na tela
  const showMessage = (message, type) => {
    const messageClass = type === 'success' ? 'message-success' : 'message-error';
    messageContainer.innerHTML = `<div class="message-box ${messageClass}">${message}</div>`;
  };

  // Função para carregar disciplinas e temas da API 
  const carregarSelects = async () => {
    try {
        // Carregar Disciplinas
        const responseDisciplinas = await fetch('http://localhost:3000/api/disciplinas');
        if (responseDisciplinas.ok) {
            const disciplinas = await responseDisciplinas.json(); // 1. Converte a resposta em JSON
            
            disciplinas.forEach(disciplina => {
                // Cria um novo elemento <option>
                const option = document.createElement('option');

                // Define o valor (o que é enviado) e o texto (o que é visto)
                option.value = disciplina.cod;
                option.textContent = disciplina.descricao; // Assumindo que a coluna no BD é 'nome'

                // Adiciona ao <select> correto
                disciplinaSelect.appendChild(option);
            });
        }
        
        // Carregar Temas
        const responseTemas = await fetch('/api/temas');
        if (responseTemas.ok) {
            const temas = await responseTemas.json();
            temas.forEach(tema => {
                const option = new Option(tema.nome, tema.cod);
                temaSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Erro ao carregar disciplinas/temas:", error);
    }
  };

  // Chama a função para popular os selects
  carregarSelects();
});