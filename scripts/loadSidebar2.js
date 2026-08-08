// Redireciona o carregamento para o script unificado loadSidebar.js
if (typeof isRoot === 'undefined') {
    const script = document.createElement('script');
    const isRootPage = !window.location.pathname.includes('/pages/');
    script.src = isRootPage ? './scripts/loadSidebar.js' : '../scripts/loadSidebar.js';
    document.head.appendChild(script);
}  