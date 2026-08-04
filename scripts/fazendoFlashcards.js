const API_BASE = 'http://localhost:3000/api';

function getToken() {
    return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
}

function getAuthHeaders() {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

let baralhoId = null;
let todosCartoesDoBaralho = [];
let cartoes = []; // Cartões ativos na sessão de estudo
let indiceAtual = 0;
let respostaRevelada = false;
let modoPratica = false; // Se true, não altera datas de revisão no BD

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    baralhoId = urlParams.get('baralho_id');

    if (!baralhoId) {
        alert('Baralho não especificado.');
        window.location.href = 'verBaralhos.html';
        return;
    }

    // Clique no cartão para revelar/esconder resposta
    const cardEstudo = document.getElementById('cardEstudo');
    cardEstudo.addEventListener('click', () => {
        if (cartoes.length === 0) return;
        respostaRevelada = !respostaRevelada;
        atualizarExibicaoCard();
    });

    // Botões de navegação lateral
    document.getElementById('antesQuest').addEventListener('click', () => {
        if (indiceAtual > 0) {
            indiceAtual--;
            respostaRevelada = false;
            atualizarExibicaoCard();
        }
    });

    document.getElementById('proxQuest').addEventListener('click', () => {
        if (indiceAtual < cartoes.length - 1) {
            indiceAtual++;
            respostaRevelada = false;
            atualizarExibicaoCard();
        }
    });

    // Botões de feedback SRS (1 = Errei, 2 = Difícil, 3 = Médio, 4 = Fácil)
    const botoesFeedback = document.querySelectorAll('#painelFeedback button');
    botoesFeedback.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const dificuldade = Number(btn.getAttribute('data-dificuldade'));
            await enviarRevisao(dificuldade);
        });
    });

    // Evento do botão "Revisar Todos (Modo Prática)" no modal
    const btnConfirmarModoPratica = document.getElementById('btnConfirmarRevisarTodos');
    if (btnConfirmarModoPratica) {
        btnConfirmarModoPratica.addEventListener('click', () => {
            const modalElement = document.getElementById('modalSemPendentes');
            const modalInstance = bootstrap.Modal.getInstance(modalElement);
            if (modalInstance) modalInstance.hide();

            iniciarModoPratica();
        });
    }

    // Evento do botão Verificar Resposta (para tipo escrita)
    const btnVerificar = document.getElementById('btnVerificarResposta');
    if (btnVerificar) {
        btnVerificar.addEventListener('click', (e) => {
            e.stopPropagation();
            respostaRevelada = true;
            atualizarExibicaoCard();
        });
    }

    carregarBaralhoECartoes();
});

async function carregarBaralhoECartoes() {
    try {
        // Carregar nome do baralho
        const resBaralhos = await fetch(`${API_BASE}/baralhos`, { headers: getAuthHeaders() });
        if (resBaralhos.ok) {
            const baralhos = await resBaralhos.json();
            const baralho = baralhos.find(b => b.id === Number(baralhoId));
            if (baralho) {
                document.getElementById('nomeBaralhoEstudo').textContent = baralho.nome;
            }
        }

        // Carregar cartões
        const resCartoes = await fetch(`${API_BASE}/cartoes/baralho/${baralhoId}`, { headers: getAuthHeaders() });
        if (!resCartoes.ok) {
            alert('Erro ao carregar os cartões do baralho.');
            return;
        }

        todosCartoesDoBaralho = await resCartoes.json();

        if (todosCartoesDoBaralho.length === 0) {
            exibirMensagemVazio();
            return;
        }

        // Filtrar apenas cartões que precisam ser revisados hoje
        const agora = new Date();
        agora.setHours(0, 0, 0, 0);

        const cartoesPendentes = todosCartoesDoBaralho.filter(c => {
            if (!c.data_proxima_revisao) return true;
            const proxima = new Date(c.data_proxima_revisao);
            proxima.setHours(0, 0, 0, 0);
            return proxima <= agora;
        });

        if (cartoesPendentes.length > 0) {
            modoPratica = false;
            cartoes = cartoesPendentes;
            indiceAtual = 0;
            respostaRevelada = false;
            atualizarExibicaoCard();
        } else {
            // Nenhum cartão pendente -> Exibir modal para perguntar se quer revisar todos em modo prática
            const modalElement = document.getElementById('modalSemPendentes');
            const modalInstance = new bootstrap.Modal(modalElement);
            modalInstance.show();
        }

    } catch (error) {
        console.error(error);
        alert('Erro de conexão ao carregar baralho.');
    }
}

function iniciarModoPratica() {
    modoPratica = true;
    cartoes = [...todosCartoesDoBaralho];
    indiceAtual = 0;
    respostaRevelada = false;

    const tituloEl = document.getElementById('nomeBaralhoEstudo');
    if (!tituloEl.textContent.includes('(Modo Prática)')) {
        tituloEl.textContent += ' (Modo Prática)';
    }

    atualizarExibicaoCard();
}

function normalizarTexto(str) {
    return String(str || '').toLowerCase().trim().replace(/[^\w\sà-ú]/gi, '');
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function calcularLevenshtein(a, b) {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
}

function calcularSimilaridade(s1, s2) {
    const n1 = normalizarTexto(s1);
    const n2 = normalizarTexto(s2);
    if (!n1 && !n2) return 1.0;
    if (!n1 || !n2) return 0.0;
    if (n1 === n2) return 1.0;

    const dist = calcularLevenshtein(n1, n2);
    const maxLen = Math.max(n1.length, n2.length);
    return 1 - (dist / maxLen);
}

function gerarComparacaoBadges(respostaDigitada, respostaEsperada) {
    const palavrasDigitadas = (respostaDigitada || '').trim().split(/\s+/).filter(w => w.length > 0);
    const palavrasEsperadas = (respostaEsperada || '').trim().split(/\s+/).filter(w => w.length > 0);

    const normalizadasEsperadas = palavrasEsperadas.map(normalizarTexto);

    if (palavrasDigitadas.length === 0) {
        return '<span class="text-muted small">Nenhuma resposta digitada.</span>';
    }

    const htmlBadges = palavrasDigitadas.map((palavraDigitada, index) => {
        const normDigitada = normalizarTexto(palavraDigitada);
        const normEsperadaMesmaPos = normalizadasEsperadas[index];

        // 1. VERDE: Exatamente igual e na mesma posição
        if (normEsperadaMesmaPos && normDigitada === normEsperadaMesmaPos) {
            return `<span class="word-badge exact-green" title="Exatamente igual e na posição correta">${escapeHtml(palavraDigitada)}</span>`;
        }

        // 2. AMARELO: Na resposta em outra posição OU >= 80% similaridade com alguma palavra
        const encontradaOutraPosicao = normalizadasEsperadas.includes(normDigitada);
        
        let maiorSimilaridade = 0;
        normalizadasEsperadas.forEach(exp => {
            const sim = calcularSimilaridade(normDigitada, exp);
            if (sim > maiorSimilaridade) maiorSimilaridade = sim;
        });

        if (encontradaOutraPosicao || maiorSimilaridade >= 0.8) {
            const motivo = encontradaOutraPosicao ? 'Posição diferente' : `Similaridade ${(maiorSimilaridade * 100).toFixed(0)}%`;
            return `<span class="word-badge similar-yellow" title="${motivo}">${escapeHtml(palavraDigitada)}</span>`;
        }

        // 3. VERMELHO: Não está na resposta e não é similar
        return `<span class="word-badge wrong-red" title="Incorreta">${escapeHtml(palavraDigitada)}</span>`;
    }).join(' ');

    return htmlBadges;
}

function atualizarExibicaoCard() {
    if (indiceAtual >= cartoes.length) {
        exibirMensagemConcluido();
        return;
    }

    const cartao = cartoes[indiceAtual];
    const total = cartoes.length;

    // Atualizar contador de progresso
    document.getElementById('contadorProgresso').textContent = `${indiceAtual + 1}/${total}`;

    // Atualizar Pergunta e Resposta
    document.getElementById('textoPergunta').textContent = cartao.frente;
    document.getElementById('textoResposta').textContent = cartao.verso;

    const areaEscrita = document.getElementById('areaEscritaInput');
    const dicaVirar = document.getElementById('dicaVirar');
    const facePergunta = document.getElementById('facePergunta');
    const faceResposta = document.getElementById('faceResposta');
    const painelFeedback = document.getElementById('painelFeedback');
    const areaComparacao = document.getElementById('areaComparacao');
    const comparacaoBadges = document.getElementById('comparacaoBadges');

    const ehTipoEscrita = cartao.tipo === 'escrita';

    if (ehTipoEscrita) {
        areaEscrita.style.display = 'block';
        if (dicaVirar) dicaVirar.style.display = 'none';
    } else {
        areaEscrita.style.display = 'none';
        if (dicaVirar) dicaVirar.style.display = 'inline-flex';
    }

    if (respostaRevelada) {
        facePergunta.style.display = 'none';
        faceResposta.style.display = 'block';

        if (ehTipoEscrita) {
            const digitada = document.getElementById('respostaDigitadaInput').value;
            comparacaoBadges.innerHTML = gerarComparacaoBadges(digitada, cartao.verso);
            areaComparacao.style.display = 'block';
        } else {
            areaComparacao.style.display = 'none';
        }

        painelFeedback.style.opacity = '1';
        painelFeedback.style.pointerEvents = 'auto';
    } else {
        facePergunta.style.display = 'block';
        faceResposta.style.display = 'none';
        areaComparacao.style.display = 'none';

        if (ehTipoEscrita) {
            document.getElementById('respostaDigitadaInput').value = '';
        }

        painelFeedback.style.opacity = '0.5';
        painelFeedback.style.pointerEvents = 'none';
    }
}

async function enviarRevisao(dificuldade) {
    if (indiceAtual >= cartoes.length) return;

    const cartao = cartoes[indiceAtual];

    // Se estiver em modo prática, NÃO envia a requisição ao BD para não alterar a data de revisão!
    if (!modoPratica) {
        try {
            const res = await fetch(`${API_BASE}/cartoes/${cartao.id}/revisar`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ dificuldade })
            });

            if (!res.ok) {
                console.error('Erro ao enviar revisão');
            }
        } catch (error) {
            console.error(error);
        }
    }

    // Se respondeu 'Errei', reinsere no final da fila da sessão atual para praticar novamente
    if (dificuldade === 1) {
        cartoes.push(cartao);
    }

    // Avançar para o próximo cartão
    indiceAtual++;
    respostaRevelada = false;
    atualizarExibicaoCard();
}

function exibirMensagemVazio() {
    const areaEstudo = document.getElementById('areaEstudo');
    areaEstudo.innerHTML = `
        <div class="text-center p-5 bg-white rounded-3 border w-100">
            <h4 class="text-muted mb-3">Este baralho não contém cartões para estudar.</h4>
            <a href="adicionarCartao.html?baralho_id=${baralhoId}" class="btn btn-rosa">
                <i class="bi bi-plus-lg"></i> Adicionar cartões agora
            </a>
        </div>
    `;
    document.getElementById('contadorProgresso').textContent = '0/0';
}

function exibirMensagemConcluido() {
    const areaEstudo = document.getElementById('areaEstudo');
    areaEstudo.innerHTML = `
        <div class="text-center p-5 bg-white rounded-3 border w-100 shadow-sm">
            <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
            <h3 class="mt-3 font-weight-bold" style="color: #2c3e50;">Parabéns!</h3>
            <p class="text-muted mb-4">${modoPratica ? 'Você concluiu a sessão em Modo Prática.' : 'Você concluiu a revisão dos cartões pendentes deste baralho.'}</p>
            <div class="d-flex gap-2 justify-content-center">
                <a href="verBaralhos.html" class="btn btn-verde">
                    <i class="bi bi-collection-fill"></i> Voltar para Meus Flashcards
                </a>
                <button onclick="location.reload()" class="btn btn-rosa">
                    <i class="bi bi-arrow-counterclockwise"></i> Recomeçar
                </button>
            </div>
        </div>
    `;
    document.getElementById('contadorProgresso').textContent = `${cartoes.length}/${cartoes.length}`;
}
