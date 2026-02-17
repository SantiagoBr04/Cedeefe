document.addEventListener('DOMContentLoaded', () => {

  // Tenta carregar as questões do localStorage
  const questoesSalvas = localStorage.getItem('listaDeQuestoes');
  const simulado = questoesSalvas ? JSON.parse(questoesSalvas) : null;

  // Verificação básica
  if (!simulado || simulado.length === 0) {
    alert("Nenhuma lista de questões encontrada. Crie uma primeiro!");
    window.location.href = 'criarLista.html';
    return; // Para a execução aqui
  }

  // Seleciona os elementos da página
  const cabecalhoElement = document.getElementById('cabecalho-questao');
  const questaoElement = document.querySelector('.enunciadoQuest');
  const alternativasElement = document.querySelector('.alternativas');
  const btnVerificar = document.getElementById('submit');
  btnExplicacao = document.getElementById('btn-explicacao');
  const boxExplicacao = document.getElementById('box-explicacao');
  
  let questaoAtual = 0;
  let respostasSelecionadas = {}; 
  let jaVerificado = new Set(); 

  // Função para carregar a questão
  function carregarQuestao() {

    btnExplicacao.style.display = "none"; // Esconde botão explicação
    boxExplicacao.style.display = "none"; // Esconde caixa texto
    
    // Pega os dados da questão atual 
    const questao = simulado[questaoAtual];

    // Parte fixa: "Questão X de Y"
    let textoCabecalho = `Questão ${questaoAtual + 1} de ${simulado.length}`;

    // Parte dinâmica: Adiciona Autor e Ano se existirem
    if (questao.autor) {
        textoCabecalho += ` - ${questao.autor}`;
    }
    
    if (questao.ano) {
        textoCabecalho += ` (${questao.ano})`; // Ex: (2024)
    }

    // Atualiza o HTML
    cabecalhoElement.innerText = textoCabecalho;
    
    // Tenta achar se já existe uma imagem na tela (da questão anterior)
    let imgElement = document.querySelector('.imgQuest');

    // Verifica se a questão atual tem imagem no banco
    if (questao.imagem_url) {
      // Se não existe a tag <img> no HTML ainda, cria ela
      if (!imgElement) {
        imgElement = document.createElement('img');
        imgElement.classList.add('imgQuest'); // Adiciona a classe do CSS
        imgElement.alt = "Imagem da questão";
        
        // Insere a imagem antes do texto do enunciado
        questaoElement.parentNode.insertBefore(imgElement, questaoElement);
      }

      // Define a url correta da imagem
      imgElement.src = `http://localhost:3000/imagens/${questao.imagem_url}`;
      
    } else {
      // Se a questão não tem imagem, mas existe uma tag <img> na tela (da anterior), remove ela
      if (imgElement) {
        imgElement.remove();
      }
    }

    // Mostra o enunciado
    questaoElement.innerText = questao.descricao; 

    // Limpa as alternativas antigas
    alternativasElement.innerHTML = '';

    // Cria as alternativas
    let alternativasObjeto;
    try {
        alternativasObjeto = (typeof questao.alternativas === 'string') 
            ? JSON.parse(questao.alternativas) 
            : questao.alternativas;
    } catch(e) {
        console.error("Erro ao ler alternativas", e);
        alternativasObjeto = [];
    }

    // Se as alternativas agora são um array (do novo sistema), use forEach
    if (Array.isArray(alternativasObjeto)) {
        alternativasObjeto.forEach((alt, index) => {
             criarDivAlternativa(alt.texto, index); // index funciona como letra (0=A, 1=B)
        });
    } else {
        // Lógica antiga (Objeto)
        for (const [letra, texto] of Object.entries(alternativasObjeto)) {
            criarDivAlternativa(texto, letra);
        }
    }
    // A parte acima tem dois tratamentos das alternativas devido a minha indecição sobre o banco de dados :)
    
    // Função auxiliar para criar o visual da alternativa 
    function criarDivAlternativa(texto, chave) {
      const div = document.createElement('div');
      div.classList.add('alternativa');
      div.innerText = texto;
      div.dataset.chave = chave; 

      div.addEventListener('click', () => {
        if (jaVerificado.has(questaoAtual)) return; 

        document.querySelectorAll('.alternativa').forEach(a => a.classList.remove('selecionada'));

        div.classList.add('selecionada');
        respostasSelecionadas[questaoAtual] = div;
      });

      alternativasElement.appendChild(div);
    }
    
    document.querySelectorAll('.alternativa').forEach(a => a.style.pointerEvents = 'auto');
    jaVerificado.delete(questaoAtual); 
  }

  // Event Listeners dos botões
  btnVerificar.addEventListener('click', () => {
    // Verifica se o usuário selecionou algo
    if (!respostasSelecionadas[questaoAtual]) {
        alert("Selecione uma alternativa antes de verificar!");
        return;
    }

    // 2. Bloqueia para não poder mudar a resposta depois de verificar
    if (jaVerificado.has(questaoAtual)) return; 
    jaVerificado.add(questaoAtual); // Marca como verificada

    // 3. Pega os dados
    const divSelecionada = respostasSelecionadas[questaoAtual];
    const indexSelecionado = divSelecionada.dataset.chave; // Lembra que salvamos o index aqui?
    const questao = simulado[questaoAtual];
    
    // Converte alternativas se necessário
    let alternativas = (typeof questao.alternativas === 'string') 
        ? JSON.parse(questao.alternativas) 
        : questao.alternativas;

    // 4. Acha qual é a correta nos dados
    // O backend envia 'correta: true' ou 'correta: 1'
    let indexCorreto = -1;
    alternativas.forEach((alt, index) => {
        if (alt.correta === true || alt.correta === 1) {
            indexCorreto = index;
        }
    });

    // 5. PINTA AS ALTERNATIVAS (Feedback Visual)
    const todasDivs = document.querySelectorAll('.alternativa');
    
    // Pinta a CORRETA de verde (sempre mostra qual era a certa)
    if (indexCorreto !== -1 && todasDivs[indexCorreto]) {
        todasDivs[indexCorreto].classList.add('correta');
    }

    // Se o usuário errou, pinta a dele de vermelha
    if (parseInt(indexSelecionado) !== indexCorreto) {
        divSelecionada.classList.add('errada');
    }

    // 6. LÓGICA DA EXPLICAÇÃO
    // Só mostra o botão SE tiver explicação cadastrada no banco
    if (questao.explicacao && questao.explicacao.trim() !== "") {
        btnExplicacao.style.display = "inline-block"; // Mostra o botão preto
        boxExplicacao.innerText = questao.explicacao; // Coloca o texto na caixa
    }
    
    // Desabilita cliques nas alternativas
    todasDivs.forEach(div => div.style.pointerEvents = 'none');
  });

  // Lógica do Botão EXPLICAÇÃO (Mostrar/Esconder)
  btnExplicacao.addEventListener('click', () => {
      if (boxExplicacao.style.display === "none" || boxExplicacao.style.display === "") {
          boxExplicacao.style.display = "block";
          btnExplicacao.innerHTML = '<span class="material-symbols-outlined" style="vertical-align: middle; font-size: 18px;">visibility_off</span> Esconder Explicação';
      } else {
          boxExplicacao.style.display = "none";
          btnExplicacao.innerHTML = '<span class="material-symbols-outlined" style="vertical-align: middle; font-size: 18px;">lightbulb</span> Ver Explicação';
      }
  });
  
  const btnProx = document.getElementById('proxQuest');
  if(btnProx) {
      btnProx.addEventListener('click', () => {
        if (questaoAtual < simulado.length - 1) {
          questaoAtual++;
          carregarQuestao();
        } else {
          alert("Você chegou ao final da lista!");
        }
      });
  }

  const btnAntes = document.getElementById('antesQuest');
  if(btnAntes) {
      btnAntes.addEventListener('click', () => {
        if (questaoAtual > 0) {
          questaoAtual--;
          carregarQuestao();
        }
      });
  }

  // Carrega a primeira questão
  carregarQuestao();
});