
const simulado = [
  {
    questao: "Quanto é 2 + 2?",
    alternativas: ["3", "4", "5","6"],
    correta: "4"
  },
  {
    questao: "Qual a capital do Brasil?",
    alternativas: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"],
    correta: "Brasília"
  },
  {
    questao: "Qual a formula do teorema de pitágoras?",
    alternativas: ["Q=m x L", "c²=b²+a²", "x=-b±", "E=mc²"],
    correta: "c²=b²+a²"
  }
];

const questaoElement = document.querySelector('.enunciadoQuest');
const alternativasElement = document.querySelector('.alternativas');
let questaoAtual = 0;
let respostaSelecionada = null;

function carregarQuestao() {
  const questao = simulado[questaoAtual];

  // mostra o enunciado
  questaoElement.innerText = questao.questao;

  // limpa as alternativas antigas
  alternativasElement.innerHTML = '';

  // cria as alternativas
  questao.alternativas.forEach(option => {
    const div = document.createElement('div');
    div.classList.add('alternativa');
    div.innerText = option;

    // adiciona evento de clique
    div.addEventListener('click', () => {
      // remove seleção anterior
      document.querySelectorAll('.alternativa').forEach(a => a.classList.remove('selecionada'));

      // marca a clicada
      div.classList.add('selecionada');
      respostaSelecionada = div;
    });

    alternativasElement.appendChild(div);
  });
}

// botão verificar resposta
document.getElementById('submit').addEventListener('click', () => {
  const correta = simulado[questaoAtual].correta;

  if (!respostaSelecionada) {
    alert("Escolha uma alternativa antes de continuar!");
    return;
  } 

  if (respostaSelecionada.innerText === correta) {
    respostaSelecionada.classList.add("correta");
  } else {
    respostaSelecionada.classList.add("errada");
    document.querySelectorAll(".alternativa").forEach(alt => {
      if (alt.innerText === correta) {
        alt.classList.add("correta");
      }
    });
  }

  // desabilita novas seleções
  document.querySelectorAll('.alternativa').forEach(a => a.style.pointerEvents = 'none');});


  document.getElementById('proxQuest').addEventListener('click', () => {
  questaoAtual++;
  if (questaoAtual < simulado.length) {
    carregarQuestao();
  }});

   document.getElementById('antesQuest').addEventListener('click', () => {
  if (questaoAtual > 0) {
    questaoAtual--
    carregarQuestao()
  }});


// carrega a primeira questão
carregarQuestao();