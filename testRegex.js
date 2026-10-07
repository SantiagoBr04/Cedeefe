function processarFormatacaoTexto(texto) {
    if (texto === null || texto === undefined) return '';
    let html = String(texto);

    // 1. Ajusta URLs relativas de tags <img> contidas no HTML do texto (ex: src="/uploads/...")
    html = html.replace(/<img\s+([^>]*?)src=["'](\/[^"']+)["']/gi, (match, prefix, path) => {
        const backendUrl = 'http://localhost:3000';
        const novoPath = path.startsWith('/imagens/') ? `${backendUrl}${path}` : `${backendUrl}/imagens${path}`;
        return `<img ${prefix}src="${novoPath}"`;
    });

    // 2. Remove demarcadores de bloco/inline de LaTeX: $$...$$, \[...\], $...$, \(...\)
    html = html.replace(/\$\$(.*?)\$\$/gs, '$1');
    html = html.replace(/\\\[(.*?)\\\]/gs, '$1');
    html = html.replace(/\$(.*?)\$/g, '$1');
    html = html.replace(/\\\((.*?)\\\)/g, '$1');

    // 3. Comandos complexos de LaTeX: \frac{numerador}{denominador} -> (numerador/denominador) e \sqrt{expressao}
    html = html.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');
    html = html.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
    html = html.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, '√$1');

    // 4. Comandos de operadores e símbolos matemáticos LaTeX
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

    // 5. Letras gregas LaTeX
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

    // 6. Flechas e conectivos LaTeX
    html = html.replace(/\\rightarrow/g, ' → ');
    html = html.replace(/\\leftarrow/g, ' ← ');
    html = html.replace(/\\Rightarrow/g, ' ⇒ ');
    html = html.replace(/\\Leftrightarrow/g, ' ⇔ ');

    // 7. Expoentes/Potências com chaves, parênteses ou simples ex: x^{2+n}, x^(2+n), 5^2
    html = html.replace(/([a-zA-Z0-9\)])\^\{([^}]+)\}/g, '$1<sup>$2</sup>');
    html = html.replace(/([a-zA-Z0-9\)])\^\(([^)]+)\)/g, '$1<sup>$2</sup>');
    html = html.replace(/([a-zA-Z0-9\)])\^([a-zA-Z0-9+\-]+)/g, '$1<sup>$2</sup>');

    // 8. Subscritos com chaves, parênteses ou simples ex: x_{1}, H_2O
    html = html.replace(/([a-zA-Z0-9])_\{([^}]+)\}/g, '$1<sub>$2</sub>');
    html = html.replace(/([a-zA-Z0-9])_\(([^)]+)\)/g, '$1<sub>$2</sub>');
    html = html.replace(/([a-zA-Z0-9])_([a-zA-Z0-9+\-]+)/g, '$1<sub>$2</sub>');

    // 9. Notações Markdown para Negrito e Itálico
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 10. Preserva quebras de linha (\n -> <br>)
    html = html.replace(/\r?\n/g, '<br>');

    // 14. Prevenção de XSS Básico
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    return html;
}

const input = `Mas bah né<div><img src="https://res.cloudinary.com/hjjjqjl3/image/upload/v1791413089/cedeefe_questoes/zfupkicgyb2agu6hvebo.jpg" class="img-questao" style="display:block; width:60%; max-width:100%; height:auto; margin:8px auto;" alt="" draggable="false"></div><div>Mas bah tchê<br>&nbsp;<br></div>`;
console.log(processarFormatacaoTexto(input));
