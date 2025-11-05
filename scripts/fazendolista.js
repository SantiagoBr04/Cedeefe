// Tenta carregar as questões do localStorage
const questoesSalvas = localStorage.getItem('listaDeQuestoes');

const simulado = questoesSalvas ? JSON.parse(questoesSalvas) : null;

// Verificação basica, para evitar que um usuario tente acessar
// Uma lista de questões sem ter uma criada
if (!simulado || simulado.length === 0) {
  alert("Nenhuma lista de questões encontrada. Crie uma primeiro!");
  window.location.href = 'criarLista.html';
} else {
  // Seleciona os elementos da página
  const questaoElement = document.querySelector('.enunciadoQuest');
  const alternativasElement = document.querySelector('.alternativas');
  let questaoAtual = 0;
  let respostasSelecionadas = {}; // Objeto para guardar as respostas do usuário
  let jaVerificado = new Set(); // Conjunto para saber quais questões já foram verificadas

  // Função para carregar a questão (meio obvio)
  function carregarQuestao() {
    const questao = simulado[questaoAtual];

    // Mostra o enunciado
    questaoElement.innerText = questao.descricao; // descricao é o enunciado basicamente

     // Limpa as alternativas antigas
    alternativasElement.innerHTML = '';

    // Cria as alternativas, que agora vêm como um array de objetos
    questao.alternativas.forEach(alt => {
      const div = document.createElement('div');
      div.classList.add('alternativa');
      div.innerText = alt.texto;
      div.dataset.cod = alt.cod; // Guarda o código da alternativa no elemento

      // Adiciona evento de clique
      div.addEventListener('click', () => {
        if (jaVerificado.has(questaoAtual)) return; // Não permite selecionar se já foi verificado

        // Remove seleção anterior
        document.querySelectorAll('.alternativa').forEach(a => a.classList.remove('selecionada'));

        // Marca a clicada
        div.classList.add('selecionada');
        respostasSelecionadas[questaoAtual] = div;
      });

      alternativasElement.appendChild(div);
    },
  );
    
    // Habilita os botões de seleção novamente
    document.querySelectorAll('.alternativa').forEach(a => a.style.pointerEvents = 'auto');
    jaVerificado.delete(questaoAtual); // Permite verificar novamente ao carregar
  }

  // Botão para verificar a resposta da questão atual
  document.getElementById('submit').addEventListener('click', async () => {
    const alternativaSelecionadaElement = respostasSelecionadas[questaoAtual];
    
    // Verifica se uma resposta foi selecionada
    if (!alternativaSelecionadaElement) {
      alert('Por favor, selecione uma alternativa antes de verificar.');
      return;
    }

    // Impede que a mesma questão seja verificada várias vezes
    if (jaVerificado.has(questaoAtual)) {
      alert('Você já verificou esta questão.');
      return;
    }

    const questao = simulado[questaoAtual];
    const questaoCod = questao.cod;
    const alternativaCod = parseInt(alternativaSelecionadaElement.dataset.cod);

    try {
      // Envia para uma nova rota de verificação no backend
      const response = await fetch('http://localhost:3000/api/questoes/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questao_cod: questaoCod, alternativa_cod: alternativaCod })
      });

      if (!response.ok) {
        throw new Error('Falha ao comunicar com o servidor.');
      }

      const resultado = await response.json(); // Espera-se { correta: boolean, alternativaCorretaCod: int }

      // Marca que esta questão foi verificada
      jaVerificado.add(questaoAtual);

      // Desabilita o clique em todas as alternativas
      document.querySelectorAll('.alternativa').forEach(a => {
        a.style.pointerEvents = 'none';
      });

      // Aplica o estilo de incorreta na alternativa que o usuário selecionou
      if (!resultado.correta) {
        alternativaSelecionadaElement.classList.add('incorreta');
      }

      // Encontra e destaca a alternativa correta
      const alternativaCorretaElement = document.querySelector(`.alternativa[data-cod="${resultado.alternativaCorretaCod}"]`);
      if (alternativaCorretaElement) {
        alternativaCorretaElement.classList.add('correta');
      }

    } catch (error) {
      console.error('Erro ao verificar resposta:', error);
      alert('Não foi possível verificar a resposta. Tente novamente.');
    }
  });

  document.getElementById('proxQuest').addEventListener('click', () => {
    if (questaoAtual < simulado.length - 1) {
      questaoAtual++;
      carregarQuestao();
    } else {
      // Quando chegar na última questão, sera enviado para a correção final
      alert("Você chegou ao final da lista!");
      // Futuramente, sera chamado a rota /api/simulados/corrigir
    }
  });

  document.getElementById('antesQuest').addEventListener('click', () => {
    if (questaoAtual > 0) {
      questaoAtual--;
      carregarQuestao();
    }
  });

  // Carrega a primeira questão
  carregarQuestao();
}