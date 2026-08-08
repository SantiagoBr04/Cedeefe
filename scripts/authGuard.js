/**
 * Guardião de Autenticação Centralizado - Cedeefe
 * Este script gerencia a verificação de sessão por token JWT,
 * validação de perfil (usuário comum vs admin) e redirecionamentos sem flicker.
 */

// Recupera o token JWT armazenado em localStorage ou sessionStorage
function obterToken() {
    return localStorage.getItem('jwt_token') || sessionStorage.getItem('jwt_token');
}

// Injeta o estilo anti-flicker e oculta o elemento raiz temporariamente durante a validação
function aplicarAntiFlicker() {
    if (document.documentElement) {
        document.documentElement.classList.add('auth-pending');
    }

    // Injeta a regra CSS anti-flicker no documento caso ainda não exista
    if (!document.getElementById('auth-guard-style')) {
        const style = document.createElement('style');
        style.id = 'auth-guard-style';
        style.textContent = `
            html.auth-pending body {
                opacity: 0 !important;
                visibility: hidden !important;
            }
            body {
                transition: opacity 0.15s ease-in-out;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }
}

// Remove a classe anti-flicker e torna a página visível suavemente
function revelarPagina() {
    if (document.documentElement) {
        document.documentElement.classList.remove('auth-pending');
    }
}

// Redireciona o usuário para a página de login e limpa tokens inválidos
function redirecionarParaLogin(mensagem) {
    if (mensagem) {
        console.warn(mensagem);
    }

    // Remove tokens armazenados
    localStorage.removeItem('jwt_token');
    sessionStorage.removeItem('jwt_token');

    const pathAtual = window.location.pathname;

    // Evita loop de redirecionamento se já estiver em login ou cadastro
    if (pathAtual.includes('login.html') || pathAtual.includes('criarConta.html')) {
        return;
    }

    // Armazena a página tentada para redirecionar de volta após o login
    sessionStorage.setItem('redirect_after_login', window.location.href);

    const isRoot = !pathAtual.includes('/pages/');
    const paginaLogin = isRoot ? 'pages/login.html' : 'login.html';

    window.location.href = paginaLogin;
}

// Trata respostas HTTP 401 (Não autorizado) e 403 (Proibido) em requisições de API
function tratarRespostaNaoAutorizada(response) {
    if (response.status === 401) {
        redirecionarParaLogin('Sessão expirada ou token inválido. Por favor, faça login novamente.');
        return true;
    }
    if (response.status === 403) {
        console.warn('Acesso negado para este recurso.');
        const isRoot = !window.location.pathname.includes('/pages/');
        window.location.href = isRoot ? 'pages/dashboard.html' : 'dashboard.html';
        return true;
    }
    return false;
}

// Valida o acesso à página atual (verificação síncrona imediata + validação remota de token)
async function validarAcessoPagina(requerAdmin = false) {
    const token = obterToken();

    // Verificação imediata client-side
    if (!token) {
        redirecionarParaLogin('Acesso negado: Token de autenticação não encontrado.');
        return null;
    }

    try {
        // Validação remota no backend
        const response = await fetch('http://localhost:3000/api/users/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (tratarRespostaNaoAutorizada(response)) {
                return null;
            }
            throw new Error('Falha ao validar sessão do usuário.');
        }

        const usuario = await response.json();

        // Validação de permissão de administrador
        if (requerAdmin && !(usuario.adm === true || usuario.adm === 1)) {
            console.warn('Acesso negado: Privilégios de administrador necessários.');
            const isRoot = !window.location.pathname.includes('/pages/');
            window.location.href = isRoot ? 'pages/dashboard.html' : 'dashboard.html';
            return null;
        }

        // Validação bem-sucedida: revela os elementos da página
        revelarPagina();
        return usuario;
    } catch (erro) {
        console.error('Erro na validação do acesso:', erro);
        // Em caso de falha de conexão com o servidor, exibe a página para evitar travamento em tela branca
        revelarPagina();
        return null;
    }
}

// Execução imediata assim que o script é lido no <head> da página
(function iniciarGuardiao() {
    const token = obterToken();
    const pathAtual = window.location.pathname;

    // Se estiver nas telas públicas de login ou cadastro, ignora a trava de segurança
    if (pathAtual.includes('login.html') || pathAtual.includes('criarConta.html')) {
        return;
    }

    // Se não houver token, redireciona IMEDIATAMENTE no <head> antes de montar o <body>
    if (!token) {
        redirecionarParaLogin('Acesso negado: Token de autenticação não encontrado.');
        return;
    }

    // Se houver token, oculta temporariamente a tela durante a verificação remota da API
    aplicarAntiFlicker();

    // Timeout de segurança para evitar tela bloqueada caso ocorra instabilidade na rede
    setTimeout(revelarPagina, 3000);
})();

// Execução automática da verificação de permissões do body após montagem do DOM
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    if (body) {
        const requerAuth = body.getAttribute('data-auth-required') === 'true';
        const requerAdmin = body.getAttribute('data-admin-required') === 'true';

        if (requerAuth || requerAdmin) {
            validarAcessoPagina(requerAdmin);
        } else {
            revelarPagina();
        }
    } else {
        revelarPagina();
    }
});
