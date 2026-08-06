document.addEventListener('DOMContentLoaded', async () => {

  const urlParams = new URLSearchParams(window.location.search);
  const codListaParam = urlParams.get('codLista');
  const token = localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');

  let atividadeCod = codListaParam || localStorage.getItem('atividadeAtualID');
  let simulado = [];
  let nomeLista = 'Lista de Exercícios';
  let disciplinaNome = 'Geral';
  let questaoAtual = 0;
  let respostasSelecionadas = {}; // questaoIndex -> div selecionada
  let respostasPorQuestao = {};   // questaoIndex -> alternativa_cod selecionada
  let jaVerificado = new Set(); 

  // Seleciona os elementos da página
  const contentContainer = document.querySelector('.content');
  const cabecalhoElement = document.getElementById('cabecalho-questao');
  const questaoElement = document.querySelector('.enunciadoQuest');
  const alternativasElement = document.querySelector('.alternativas');
  const btnVerificar = document.getElementById('submit');
  const btnExplicacao = document.getElementById('btn-explicacao');
  const boxExplicacao = document.getElementById('box-explicacao');
  const btnProx = document.getElementById('proxQuest');
  const btnAntes = document.getElementById('antesQuest');

  // Se houver código de atividade (via URL query param ou localStorage), busca os dados atualizados no backend
  if (atividadeCod) {
    try {
      const response = await fetch(`http://localhost:3000/api/listas/${atividadeCod}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar a lista do servidor.');
      }

      const dadosLista = await response.json();
      simulado = dadosLista.questoes || [];
      atividadeCod = dadosLista.atividade_cod;
      nomeLista = dadosLista.nome || nomeLista;
      disciplinaNome = dadosLista.disciplina || disciplinaNome;

      // Garante consistência do ID no localStorage
      localStorage.setItem('atividadeAtualID', atividadeCod);

      // Se a lista já está finalizada, exibe a tela de resultados imediatamente
      if (dadosLista.status === 'finalizada') {
        exibirTelaConclusao({
          nome: dadosLista.nome,
          disciplina: dadosLista.disciplina,
          total: dadosLista.quantidade,
          acertos: dadosLista.acertos || 0,
          erros: dadosLista.erros || 0
        });
        return;
      }

      // Restaura o estado de todas as questões que já possuem alternativa selecionada
      simulado.forEach((q, index) => {
        if (q.alternativa_selecionada_cod !== null && q.alternativa_selecionada_cod !== undefined) {
          respostasPorQuestao[index] = q.alternativa_selecionada_cod;
          jaVerificado.add(index);
        }
      });

      // Posiciona o usuário na questão onde ele parou (primeira não respondida)
      if (typeof dadosLista.ultima_questao_index === 'number') {
        questaoAtual = dadosLista.ultima_questao_index;
      }

    } catch (error) {
      console.error('Erro ao carregar lista do servidor:', error);
      // Fallback: se der erro na rede, tenta ler o que estiver no localStorage
      const questoesSalvas = localStorage.getItem('listaDeQuestoes');
      simulado = questoesSalvas ? JSON.parse(questoesSalvas) : null;

      if (!simulado || simulado.length === 0) {
        alert('Ocorreu um erro ao carregar os dados desta lista.');
        window.location.href = 'verListas.html';
        return;
      }
    }
  } else {
    // Tenta carregar do localStorage se for uma nova lista sem atividadeCod no banco
    const questoesSalvas = localStorage.getItem('listaDeQuestoes');
    simulado = questoesSalvas ? JSON.parse(questoesSalvas) : null;

    if (!simulado || simulado.length === 0) {
      alert("Nenhuma lista de questões encontrada. Crie uma primeiro!");
      window.location.href = 'criarLista.html';
      return;
    }
  }

  // Função para carregar a questão atual
  function carregarQuestao() {
    if (!simulado || simulado.length === 0) return;

    btnExplicacao.style.display = "none";
    boxExplicacao.style.display = "none";
    boxExplicacao.innerText = "";
    
    // Pega os dados da questão atual 
    const questao = simulado[questaoAtual];

    // Cabeçalho: "Questão X de Y"
    let textoCabecalho = `Questão ${questaoAtual + 1} de ${simulado.length}`;

    if (questao.autor) {
        textoCabecalho += ` - ${questao.autor}`;
    }
    
    if (questao.ano) {
        textoCabecalho += ` (${questao.ano})`;
    }

    cabecalhoElement.innerText = textoCabecalho;
    
    // Ajusta o título/tooltip do botão de avançar se estiver na última questão
    if (btnProx) {
      if (questaoAtual === simulado.length - 1) {
        btnProx.title = "Finalizar Lista";
      } else {
        btnProx.title = "Próxima Questão";
      }
    }
    
    // Imagem da questão
    let imgElement = document.querySelector('.imgQuest');

    if (questao.imagem_url) {
      if (!imgElement) {
        imgElement = document.createElement('img');
        imgElement.classList.add('imgQuest');
        imgElement.alt = "Imagem da questão";
        questaoElement.parentNode.insertBefore(imgElement, questaoElement);
      }
      imgElement.src = `http://localhost:3000/imagens/${questao.imagem_url}`;
    } else {
      if (imgElement) {
        imgElement.remove();
      }
    }

    // Enunciado com suporte a formatação HTML e notação matemática (5^2, x^2, H_2O)
    questaoElement.innerHTML = processarFormatacaoTexto(questao.descricao); 

    // Limpa alternativas anteriores
    alternativasElement.innerHTML = '';

    // Trata formato de alternativas
    let alternativasObjeto;
    try {
        alternativasObjeto = (typeof questao.alternativas === 'string') 
            ? JSON.parse(questao.alternativas) 
            : questao.alternativas;
    } catch(e) {
        console.error("Erro ao ler alternativas", e);
        alternativasObjeto = [];
    }

    const jaRespondida = jaVerificado.has(questaoAtual) || (questao.alternativa_selecionada_cod !== null && questao.alternativa_selecionada_cod !== undefined);
    const altRespondidaCod = respostasPorQuestao[questaoAtual] || questao.alternativa_selecionada_cod;

    let indexCorreto = -1;
    if (Array.isArray(alternativasObjeto)) {
        alternativasObjeto.forEach((alt, index) => {
             if (alt.correta === true || alt.correta === 1) indexCorreto = index;
             criarDivAlternativa(alt.texto, index, alt.cod);
        });
    } else {
        let indexAux = 0;
        for (const [letra, texto] of Object.entries(alternativasObjeto)) {
            criarDivAlternativa(texto, letra, null);
            indexAux++;
        }
    }

    // Função para criar div da alternativa
    function criarDivAlternativa(texto, chave, altCod) {
      const div = document.createElement('div');
      div.classList.add('alternativa');
      div.innerHTML = processarFormatacaoTexto(texto);
      div.dataset.chave = chave; 
      if (altCod !== null && altCod !== undefined) div.dataset.cod = altCod;

      // Se a questão já foi respondida (anteriormente ou nesta sessão)
      if (jaRespondida) {
        div.style.pointerEvents = 'none';
        
        // Marca a alternativa selecionada pelo usuário (compara convertendo para string)
        if (altCod !== null && altCod !== undefined && String(altCod) === String(altRespondidaCod)) {
          div.classList.add('selecionada');
          respostasSelecionadas[questaoAtual] = div;

          // Se a selecionada não for a correta, marca em vermelho (errada)
          if (indexCorreto !== -1 && parseInt(div.dataset.chave) !== indexCorreto) {
            div.classList.add('errada');
          }
        }

        // Marca a alternativa correta em verde
        if (typeof chave === 'number' && chave === indexCorreto) {
          div.classList.add('correta');
        }
      } else {
        div.addEventListener('click', () => {
          if (jaVerificado.has(questaoAtual)) return; 

          document.querySelectorAll('.alternativa').forEach(a => a.classList.remove('selecionada'));

          div.classList.add('selecionada');
          respostasSelecionadas[questaoAtual] = div;
          if (altCod !== null && altCod !== undefined) {
            respostasPorQuestao[questaoAtual] = altCod;
          }
        });
      }

      alternativasElement.appendChild(div);
    }

    if (jaRespondida) {
      btnVerificar.disabled = true;
      btnVerificar.style.opacity = '0.6';
      btnVerificar.innerText = 'Resposta Registrada';

      if (questao.explicacao && questao.explicacao.trim() !== "") {
        btnExplicacao.style.display = "inline-block";
        boxExplicacao.innerHTML = formatarExplicacaoHtml(questao.explicacao);
      }
    } else {
      btnVerificar.disabled = false;
      btnVerificar.style.opacity = '1';
      btnVerificar.innerText = 'Verificar resposta';
    }
  }

  // Event Listener do botão Verificar resposta
  btnVerificar.addEventListener('click', async () => {
    if (!respostasSelecionadas[questaoAtual]) {
        alert("Selecione uma alternativa antes de verificar!");
        return;
    }

    if (jaVerificado.has(questaoAtual)) return; 
    jaVerificado.add(questaoAtual);

    const divSelecionada = respostasSelecionadas[questaoAtual];
    const indexSelecionado = divSelecionada.dataset.chave;
    const questao = simulado[questaoAtual];
    
    let alternativas = (typeof questao.alternativas === 'string') 
        ? JSON.parse(questao.alternativas) 
        : questao.alternativas;

    let indexCorreto = -1;
    let alternativaCodSelecionada = null;

    alternativas.forEach((alt, index) => {
        if (alt.correta === true || alt.correta === 1) {
            indexCorreto = index;
        }
        if (parseInt(indexSelecionado) === index) {
            alternativaCodSelecionada = alt.cod;
        }
    });

    if (alternativaCodSelecionada !== null && alternativaCodSelecionada !== undefined) {
      respostasPorQuestao[questaoAtual] = alternativaCodSelecionada;
      questao.alternativa_selecionada_cod = alternativaCodSelecionada;
    }

    // Registra resposta no backend
    if (atividadeCod && alternativaCodSelecionada) {
      try {
        await fetch('http://localhost:3000/api/listas/responder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            atividade_cod: parseInt(atividadeCod),
            questao_cod: parseInt(questao.cod),
            alternativa_cod: parseInt(alternativaCodSelecionada)
          })
        });
      } catch (err) {
        console.error("Erro ao enviar resposta ao servidor:", err);
      }
    }

    // Aplica feedback visual
    const todasDivs = document.querySelectorAll('.alternativa');
    
    if (indexCorreto !== -1 && todasDivs[indexCorreto]) {
        todasDivs[indexCorreto].classList.add('correta');
    }

    if (parseInt(indexSelecionado) !== indexCorreto) {
        divSelecionada.classList.add('errada');
    }

    if (questao.explicacao && questao.explicacao.trim() !== "") {
        btnExplicacao.style.display = "inline-block";
        boxExplicacao.innerHTML = formatarExplicacaoHtml(questao.explicacao);
    }
    
    todasDivs.forEach(div => div.style.pointerEvents = 'none');
    btnVerificar.disabled = true;
    btnVerificar.style.opacity = '0.6';
    btnVerificar.innerText = 'Resposta Registrada';
  });

  // Função auxiliar para formatar texto (suporta HTML, Markdown, Notação Matemática e LaTeX)
  function processarFormatacaoTexto(texto) {
      if (texto === null || texto === undefined) return '';
      let html = String(texto);

      // 1. Remove demarcadores de bloco/inline de LaTeX: $$...$$, \[...\], $...$, \(...\)
      html = html.replace(/\$\$(.*?)\$\$/gs, '$1');
      html = html.replace(/\\\[(.*?)\\\]/gs, '$1');
      html = html.replace(/\$(.*?)\$/g, '$1');
      html = html.replace(/\\\((.*?)\\\)/g, '$1');

      // 2. Comandos complexos de LaTeX: \frac{numerador}{denominador} -> (numerador/denominador) e \sqrt{expressao}
      html = html.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
      html = html.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
      html = html.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, '√$1');

      // 3. Comandos de operadores e símbolos matemáticos LaTeX
      html = html.replace(/\\cdot/g, ' · ');
      html = html.replace(/\\times/g, ' × ');
      html = html.replace(/\\div/g, ' ÷ ');
      html = html.replace(/\\pm/g, ' ± ');
      html = html.replace(/\\mp/g, ' ∓ ');
      html = html.replace(/\\neq/g, ' ≠ ');
      html = html.replace(/\\leq/g, ' ≤ ');
      html = html.replace(/\\geq/g, ' ≥ ');
      html = html.replace(/\\approx/g, ' ≈ ');
      html = html.replace(/\\infty/g, ' ∞ ');
      html = html.replace(/\\degree/g, '°');
      html = html.replace(/\^\\circ/g, '°');

      // 4. Letras gregas LaTeX
      html = html.replace(/\\alpha/g, 'α');
      html = html.replace(/\\beta/g, 'β');
      html = html.replace(/\\gamma/g, 'γ');
      html = html.replace(/\\delta/g, 'δ');
      html = html.replace(/\\theta/g, 'θ');
      html = html.replace(/\\lambda/g, 'λ');
      html = html.replace(/\\pi/g, 'π');
      html = html.replace(/\\sigma/g, 'σ');
      html = html.replace(/\\omega/g, 'ω');
      html = html.replace(/\\Delta/g, 'Δ');
      html = html.replace(/\\Omega/g, 'Ω');
      html = html.replace(/\\Pi/g, 'Π');

      // 5. Flechas e conectivos LaTeX
      html = html.replace(/\\rightarrow/g, ' → ');
      html = html.replace(/\\leftarrow/g, ' ← ');
      html = html.replace(/\\Rightarrow/g, ' ⇒ ');
      html = html.replace(/\\Leftrightarrow/g, ' ⇔ ');

      // 6. Expoentes/Potências com chaves, parênteses ou simples ex: x^{2+n}, x^(2+n), 5^2
      html = html.replace(/([a-zA-Z0-9\)])\^\{([^}]+)\}/g, '$1<sup>$2</sup>');
      html = html.replace(/([a-zA-Z0-9\)])\^\(([^)]+)\)/g, '$1<sup>$2</sup>');
      html = html.replace(/([a-zA-Z0-9\)])\^([a-zA-Z0-9+\-]+)/g, '$1<sup>$2</sup>');

      // 7. Subscritos com chaves, parênteses ou simples ex: x_{1}, H_2O
      html = html.replace(/([a-zA-Z0-9])_\{([^}]+)\}/g, '$1<sub>$2</sub>');
      html = html.replace(/([a-zA-Z0-9])_\(([^)]+)\)/g, '$1<sub>$2</sub>');
      html = html.replace(/([a-zA-Z0-9])_([a-zA-Z0-9+\-]+)/g, '$1<sub>$2</sub>');

      // 8. Notações Markdown para Negrito e Itálico
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // 9. Preserva quebras de linha
      html = html.replace(/\r?\n/g, '<br>');

      return html;
  }

  // Alias mantido para compatibilidade
  function formatarExplicacaoHtml(texto) {
      return processarFormatacaoTexto(texto);
  }

  // Botão EXPLICAÇÃO
  btnExplicacao.addEventListener('click', () => {
      if (boxExplicacao.style.display === "none" || boxExplicacao.style.display === "") {
          boxExplicacao.style.display = "block";
          btnExplicacao.innerHTML = '<span class="material-symbols-outlined" style="vertical-align: middle; font-size: 18px;">visibility_off</span> Esconder Explicação';
      } else {
          boxExplicacao.style.display = "none";
          btnExplicacao.innerHTML = '<span class="material-symbols-outlined" style="vertical-align: middle; font-size: 18px;">lightbulb</span> Ver Explicação';
      }
  });
  
  // Botões Próxima / Anterior
  if (btnProx) {
      btnProx.addEventListener('click', async () => {
        if (questaoAtual < simulado.length - 1) {
          questaoAtual++;
          carregarQuestao();
        } else {
          // Chegou no final da lista -> finaliza no servidor e exibe o resumo
          await finalizarLista();
        }
      });
  }

  if (btnAntes) {
      btnAntes.addEventListener('click', () => {
        if (questaoAtual > 0) {
          questaoAtual--;
          carregarQuestao();
        }
      });
  }

  // Função para finalizar a lista no backend
  async function finalizarLista() {
    // Verifica se todas as questões da lista foram respondidas
    let respondidasCount = 0;
    simulado.forEach((q, idx) => {
      if (jaVerificado.has(idx) || respostasPorQuestao[idx] !== undefined || (q.alternativa_selecionada_cod !== null && q.alternativa_selecionada_cod !== undefined)) {
        respondidasCount++;
      }
    });

    if (respondidasCount < simulado.length) {
      const naoRespondidas = simulado.length - respondidasCount;
      const confirmacao = window.confirm(`Você ainda não respondeu todas as questões (${naoRespondidas} de ${simulado.length} pendente${naoRespondidas > 1 ? 's' : ''}). Tem certeza de que deseja finalizar a lista?`);
      if (!confirmacao) {
        return;
      }
    }

    if (!atividadeCod) {
      const acertos = Object.keys(respostasPorQuestao).reduce((acc, index) => {
        const q = simulado[index];
        let alts = (typeof q.alternativas === 'string') ? JSON.parse(q.alternativas) : q.alternativas;
        const respCod = respostasPorQuestao[index];
        const corretaObj = alts.find(a => String(a.cod) === String(respCod) && (a.correta === true || a.correta === 1));
        return corretaObj ? acc + 1 : acc;
      }, 0);

      exibirTelaConclusao({
        nome: nomeLista,
        disciplina: disciplinaNome,
        total: simulado.length,
        acertos: acertos,
        erros: simulado.length - acertos
      });
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/listas/${atividadeCod}/finalizar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const dados = await response.json();
      
      if (response.ok) {
        exibirTelaConclusao({
          nome: dados.nome || nomeLista,
          disciplina: dados.disciplina || disciplinaNome,
          total: dados.total || simulado.length,
          acertos: typeof dados.acertos === 'number' ? dados.acertos : 0,
          erros: typeof dados.erros === 'number' ? dados.erros : 0
        });
      } else {
        alert(dados.error || 'Erro ao finalizar a lista.');
      }
    } catch (error) {
      console.error('Erro ao finalizar lista:', error);
      alert('Erro ao conectar com o servidor para finalizar a lista.');
    }
  }

  // Função para exibir a tela de conclusão estilizada como card
  function exibirTelaConclusao(dados) {
    const total = dados.total || simulado.length || 0;
    const acertos = dados.acertos || 0;
    const erros = dados.erros || (total - acertos);
    const aproveitamento = total > 0 ? ((acertos / total) * 100).toFixed(0) : 0;

    contentContainer.innerHTML = `
      <div class="card-finalizacao">
        <div class="header-finalizacao">
          <span class="material-symbols-outlined icone-sucesso">check_circle</span>
          <h2>Parabéns! Lista Finalizada</h2>
          <p class="subtitulo-finalizacao">Você concluiu todos os exercícios desta lista.</p>
        </div>

        <div class="detalhes-lista-card">
          <div class="linha-detalhe">
            <span class="rotulo-detalhe"><i class="bi bi-journal-text"></i> Nome da Lista:</span>
            <span class="valor-detalhe">${dados.nome || nomeLista}</span>
          </div>
          <div class="linha-detalhe">
            <span class="rotulo-detalhe"><i class="bi bi-book"></i> Matéria:</span>
            <span class="valor-detalhe">${dados.disciplina || disciplinaNome}</span>
          </div>
          <div class="linha-detalhe">
            <span class="rotulo-detalhe"><i class="bi bi-list-ol"></i> Total de Questões:</span>
            <span class="valor-detalhe">${total}</span>
          </div>
        </div>

        <div class="grid-estatisticas">
          <div class="stat-box acertos-box">
            <span class="stat-num">${acertos}</span>
            <span class="stat-rotulo">Acertos</span>
          </div>
          <div class="stat-box erros-box">
            <span class="stat-num">${erros}</span>
            <span class="stat-rotulo">Erros</span>
          </div>
          <div class="stat-box aproveitamento-box">
            <span class="stat-num">${aproveitamento}%</span>
            <span class="stat-rotulo">Aproveitamento</span>
          </div>
        </div>

        <div class="botoes-finalizacao-container">
          <button id="btn-voltar-inicio" class="btn-finalizacao verde-btn">
            <i class="bi bi-house-door-fill"></i> Voltar ao Início
          </button>
          <button id="btn-minhas-listas" class="btn-finalizacao rosa-btn">
            <i class="bi bi-card-checklist"></i> Minhas Listas
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-voltar-inicio').addEventListener('click', () => {
      window.location.href = '../index.html';
    });

    document.getElementById('btn-minhas-listas').addEventListener('click', () => {
      window.location.href = 'verListas.html';
    });
  }

  // Carrega a questão inicial
  carregarQuestao();
});