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
let cartoes = []; // Cartões da sessão
let totalInicialSessao = 0;
let indiceAtual = 0;
let respostaRevelada = false;
let modoPratica = false;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    baralhoId = urlParams.get('baralho_id');

    if (!baralhoId) {
        alert('Baralho não especificado.');
        window.location.href = 'verBaralhos.html';
        return;
    }

    // Clique no cartão para virar
    const cardEstudo = document.getElementById('cardEstudo');
    if (cardEstudo) {
        cardEstudo.addEventListener('click', () => {
            if (cartoes.length === 0 || indiceAtual >= cartoes.length) return;
            respostaRevelada = !respostaRevelada;
            atualizarExibicaoCard();
        });
    }

    // Botões de avaliação SRS
    const botoesFeedback = document.querySelectorAll('#painelFeedback button');
    botoesFeedback.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const dificuldade = Number(btn.getAttribute('data-dificuldade'));
            await enviarRevisao(dificuldade);
        });
    });

    // Botão Modo Prática no modal
    const btnConfirmarModoPratica = document.getElementById('btnConfirmarRevisarTodos');
    if (btnConfirmarModoPratica) {
        btnConfirmarModoPratica.addEventListener('click', () => {
            const modalElement = document.getElementById('modalSemPendentes');
            if (modalElement && typeof bootstrap !== 'undefined') {
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();
            }
            iniciarModoPratica();
        });
    }

    // Botão Verificar Resposta (para cartões do tipo escrita)
    const btnVerificar = document.getElementById('btnVerificarResposta');
    if (btnVerificar) {
        btnVerificar.addEventListener('click', (e) => {
            e.stopPropagation();
            respostaRevelada = true;
            atualizarExibicaoCard();
        });
    }

    // Atalhos de Teclado (Espaço para virar, 1, 2, 3, 4 para avaliar)
    configurarAtalhosTeclado();

    // Carregamento dos dados
    carregarBaralhoECartoes();
});

function configurarAtalhosTeclado() {
    document.addEventListener('keydown', (e) => {
        // Ignora se estiver digitando em textarea/input
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'textarea' || tag === 'input') return;

        if (e.code === 'Space') {
            e.preventDefault();
            if (cartoes.length > 0 && indiceAtual < cartoes.length) {
                respostaRevelada = !respostaRevelada;
                atualizarExibicaoCard();
            }
        } else if (respostaRevelada) {
            if (e.key === '1') enviarRevisao(1);
            else if (e.key === '2') enviarRevisao(2);
            else if (e.key === '3') enviarRevisao(3);
            else if (e.key === '4') enviarRevisao(4);
        }
    });
}

async function carregarBaralhoECartoes() {
    const token = getToken();
    if (!token) {
        if (typeof redirecionarParaLogin === 'function') {
            redirecionarParaLogin('Acesso negado: Faça login para estudar os flashcards.');
        } else {
            window.location.href = 'login.html';
        }
        return;
    }

    try {
        const [resBaralhos, resCartoes] = await Promise.all([
            fetch(`${API_BASE}/baralhos`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/cartoes/baralho/${baralhoId}`, { headers: getAuthHeaders() })
        ]);

        if (!resBaralhos.ok || !resCartoes.ok) {
            throw new Error('Erro ao carregar dados do baralho.');
        }

        const baralhos = await resBaralhos.json();
        const baralho = baralhos.find(b => Number(b.id) === Number(baralhoId));
        if (baralho) {
            document.getElementById('nomeBaralhoEstudo').textContent = baralho.nome;
            document.title = `Estudando ${baralho.nome} - Cedeefe`;
        }

        todosCartoesDoBaralho = await resCartoes.json();

        if (todosCartoesDoBaralho.length === 0) {
            exibirMensagemVazio();
            return;
        }

        // Filtra cartões que estão pendentes para hoje
        const hoje = new Date();
        cartoes = todosCartoesDoBaralho.filter(cartao => {
            if (!cartao.proxima_revisao) return true; // Novo
            return new Date(cartao.proxima_revisao) <= hoje;
        });

        // Se não há cartões pendentes, abre o modal de Modo Prática
        if (cartoes.length === 0) {
            const modalSemPendentesEl = document.getElementById('modalSemPendentes');
            if (modalSemPendentesEl && typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(modalSemPendentesEl);
                modal.show();
            }
            return;
        }

        totalInicialSessao = cartoes.length;
        indiceAtual = 0;
        respostaRevelada = false;
        modoPratica = false;

        document.getElementById('badgeModoEstudo').textContent = 'Sessão de Revisão';
        atualizarExibicaoCard();

    } catch (error) {
        console.error('Erro ao carregar sessão de flashcards:', error);
        document.getElementById('areaEstudo').innerHTML = `
            <div class="text-center p-5 bg-white rounded-4 border shadow-sm">
                <i class="bi bi-exclamation-triangle text-danger fs-1"></i>
                <h4 class="mt-3">Erro ao carregar sessão</h4>
                <p class="text-muted">Não foi possível carregar os flashcards para este baralho.</p>
                <a href="verBaralhos.html" class="btn btn-outline-rosa mt-2">Voltar aos Baralhos</a>
            </div>
        `;
    }
}

function iniciarModoPratica() {
    modoPratica = true;
    cartoes = [...todosCartoesDoBaralho];
    totalInicialSessao = cartoes.length;
    indiceAtual = 0;
    respostaRevelada = false;

    document.getElementById('badgeModoEstudo').textContent = 'Modo Prática (Sem Alterar SRS)';
    atualizarExibicaoCard();
}

function atualizarExibicaoCard() {
    if (cartoes.length === 0 || indiceAtual >= cartoes.length) {
        exibirMensagemConcluido();
        return;
    }

    const cartao = cartoes[indiceAtual];
    const totalExibicao = totalInicialSessao;
    const atualNumero = Math.min(indiceAtual + 1, totalExibicao);
    const porcentagem = totalExibicao > 0 ? Math.round((indiceAtual / totalExibicao) * 100) : 0;

    // Atualiza contadores e barra de progresso
    document.getElementById('contadorProgresso').textContent = `${atualNumero}/${totalExibicao}`;
    const barra = document.getElementById('barraProgressoEstudo');
    if (barra) barra.style.width = `${porcentagem}%`;

    const facePergunta = document.getElementById('facePergunta');
    const faceResposta = document.getElementById('faceResposta');
    const textoPergunta = document.getElementById('textoPergunta');
    const textoResposta = document.getElementById('textoResposta');
    const areaEscritaInput = document.getElementById('areaEscritaInput');
    const areaComparacao = document.getElementById('areaComparacao');
    const comparacaoBadges = document.getElementById('comparacaoBadges');
    const painelFeedback = document.getElementById('painelFeedback');
    const tagTipoCartao = document.getElementById('tagTipoCartao');

    const ehTipoEscrita = cartao.tipo === 'escrita';

    if (tagTipoCartao) {
        tagTipoCartao.textContent = ehTipoEscrita ? 'Resposta Escrita' : 'Tradicional';
    }

    textoPergunta.textContent = cartao.frente || 'Sem pergunta';
    textoResposta.textContent = cartao.verso || 'Sem resposta';

    if (ehTipoEscrita) {
        areaEscritaInput.style.display = 'block';
    } else {
        areaEscritaInput.style.display = 'none';
    }

    if (respostaRevelada) {
        facePergunta.style.display = 'none';
        faceResposta.style.display = 'flex';

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
        facePergunta.style.display = 'flex';
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

    // Se NÃO estiver em modo prática, salva a revisão no backend (algoritmo SRS)
    if (!modoPratica) {
        try {
            await fetch(`${API_BASE}/cartoes/${cartao.id}/revisar`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ dificuldade })
            });
        } catch (error) {
            console.error('Erro ao enviar revisão:', error);
        }
    }

    // Se respondeu 'Errei' (1), reinsere o cartão no final da fila da sessão atual para praticar novamente
    if (dificuldade === 1) {
        cartoes.push(cartao);
    }

    indiceAtual++;
    respostaRevelada = false;
    atualizarExibicaoCard();
}

function gerarComparacaoBadges(digitada, correta) {
    const palavrasDigitadas = (digitada || '').trim().toLowerCase().split(/\s+/);
    const palavrasCorretas = (correta || '').trim().toLowerCase().split(/\s+/);

    return palavrasCorretas.map((palavraCorreta, idx) => {
        const palavraDigitada = palavrasDigitadas[idx] || '';

        if (palavraDigitada === palavraCorreta) {
            return `<span class="word-badge exact-green">${escapeHtml(palavraCorreta)}</span>`;
        } else if (palavraDigitada.length > 0 && palavraCorreta.includes(palavraDigitada)) {
            return `<span class="word-badge similar-yellow">${escapeHtml(palavraCorreta)}</span>`;
        } else {
            return `<span class="word-badge wrong-red">${escapeHtml(palavraCorreta)}</span>`;
        }
    }).join(' ');
}

function exibirMensagemVazio() {
    const areaEstudo = document.getElementById('areaEstudo');
    areaEstudo.innerHTML = `
        <div class="estado-vazio">
            <div class="estado-vazio-icone">
                <i class="bi bi-stack"></i>
            </div>
            <h4 class="estado-vazio-titulo">Este baralho não possui cartões</h4>
            <p class="estado-vazio-subtitulo">Adicione flashcards para começar a praticar e testar sua memória.</p>
            <a href="adicionarCartao.html?baralho_id=${baralhoId}" class="btn btn-verde px-4 py-2">
                <i class="bi bi-plus-lg me-1"></i> Adicionar Cartões Agora
            </a>
        </div>
    `;
    document.getElementById('contadorProgresso').textContent = '0/0';
}

function exibirMensagemConcluido() {
    const areaEstudo = document.getElementById('areaEstudo');
    const barra = document.getElementById('barraProgressoEstudo');
    if (barra) barra.style.width = '100%';

    areaEstudo.innerHTML = `
        <div class="estado-vazio">
            <div class="estado-vazio-icone" style="background-color: #eef7e5; color: #538d24;">
                <i class="bi bi-award-fill"></i>
            </div>
            <h3 class="fw-bold mb-2">Parabéns! Sessão Concluída!</h3>
            <p class="estado-vazio-subtitulo">
                ${modoPratica ? 'Você completou a revisão em Modo Prática.' : 'Você revisou todos os cartões pendentes deste baralho para hoje.'}
            </p>
            <div class="d-flex gap-2 justify-content-center flex-wrap mt-3">
                <a href="verBaralhos.html" class="btn btn-verde px-4 py-2">
                    <i class="bi bi-collection-fill me-1"></i> Meus Flashcards
                </a>
                <button onclick="location.reload()" class="btn btn-outline-rosa px-4 py-2">
                    <i class="bi bi-arrow-clockwise me-1"></i> Revisar Novamente
                </button>
            </div>
        </div>
    `;
    document.getElementById('contadorProgresso').textContent = `${totalInicialSessao}/${totalInicialSessao}`;
}

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
