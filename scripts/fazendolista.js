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

    // Cria as alternativas
    // O backend envia um JSON. Precisa 'parsear' de volta para um objeto.
    const alternativasObjeto = JSON.parse(questao.alternativas);
    for (const [letra, texto] of Object.entries(alternativasObjeto)) {
      const div = document.createElement('div');
      div.classList.add('alternativa');
      div.innerText = texto;
      div.dataset.letra = letra; // Guarda a letra ('a', 'b', 'c') no elemento

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
    }
    
    // Habilita os botões de seleção novamente
    document.querySelectorAll('.alternativa').forEach(a => a.style.pointerEvents = 'auto');
    jaVerificado.delete(questaoAtual); // Permite verificar novamente ao carregar
  }

  // Botão verificar resposta (a lógica de correção final será no backend)
  document.getElementById('submit').addEventListener('click', () => {
    // A parte de correção por questão ainda tem que ser feita, mas ela meio ue vai ser 
    // só visual, a correção mesmo so vai vir no final
    alert('Funcionalidade de verificação final será implementada. Prossiga para a próxima questão.');
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