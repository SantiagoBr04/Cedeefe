document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMessageElement = document.getElementById('error-message');

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault(); // Impede o recarregamento da página

      // Limpa mensagens de erro anteriores
      errorMessageElement.textContent = '';
      errorMessageElement.style.display = 'none';

      // Pega os valores do formulário
      const login = document.getElementById('login').value;
      const senha = document.getElementById('password').value;

      // Validação simples no frontend
      if (!login || !senha) {
        showError('Por favor, preencha todos os campos.');
        return;
      }

      try {
        // Envia os dados para a API de login
        const response = await fetch('http://localhost:3000/api/users/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ login, senha }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Se a resposta não for OK (ex: 400, 401, 500), lança um erro com a mensagem do backend
          throw new Error(data.error || 'Ocorreu um erro ao tentar fazer login.');
        }

        // Se o login for bem-sucedido
        if (data.token) {
          // Salva o token na localstorage
          // O token ficará disponível apenas nesta aba/janela do navegador
          localStorage.setItem('jwt_token', data.token);

          // Redireciona para a página inicial
          window.location.href = '/index.html'; // Ou a página que desejar
        } else {
          throw new Error('Token não recebido do servidor.');
        }

      } catch (error) {
        // Exibe a mensagem de erro na tela
        showError(error.message);
        console.error('Erro no login:', error);
      }
    });
  }

  function showError(message) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = 'block';
  }
});