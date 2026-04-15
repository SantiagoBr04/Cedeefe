# Documentação da API - Cedeefe

## Visão Geral
- Base URL local: http://localhost:3000
- Prefixo da API: /api
- Formato de resposta: JSON
- Autenticação: Bearer Token no header Authorization para rotas protegidas

Exemplo de header autenticado:

```http
Authorization: Bearer <seu_jwt_token>
```

---

## 1. Usuários

### Endpoint e Método
POST /api/users/register

### Descrição
Cria um novo usuário no sistema com senha criptografada.

### Parâmetros
- Body (JSON):
  - login (string, obrigatório)
  - senha (string, obrigatório)
  - adm (boolean, opcional)
  - data_nasc (string, opcional)
  - motivo (string, opcional)
  - escola (string, opcional)
  - genero (string, opcional)
  - endereco (string, opcional)
  - estado_civil (string, opcional)

### Exemplo de Resposta (Sucesso)
Status: 201

```json
{
  "message": "Usuário cadastrado com sucesso!",
  "userId": 12
}
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "Todos os campos são obrigatórios."
}
```

Status: 500

```json
{
  "error": "Erro interno no servidor."
}
```

---

### Endpoint e Método
POST /api/users/login

### Descrição
Autentica o usuário e retorna um token JWT.

### Parâmetros
- Body (JSON):
  - login (string, obrigatório)
  - senha (string, obrigatório)

### Exemplo de Resposta (Sucesso)
Status: 200

```json
{
  "message": "Login bem-sucedido!",
  "token": "<jwt_token>",
  "user": {
    "id": 12,
    "email": "aluno@email.com"
  }
}
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "E-mail e senha são obrigatórios."
}
```

Status: 500

```json
{
  "error": "Erro interno no servidor."
}
```

---

### Endpoint e Método
GET /api/users/profile

### Descrição
Retorna os dados básicos do perfil do usuário autenticado.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)

### Exemplo de Resposta (Sucesso)
Status: 200

```json
{
  "cod": 12,
  "login": "aluno@email.com"
}
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "Requisição inválida."
}
```

Status: 500

```json
{
  "error": "Erro interno no servidor."
}
```

---

### Endpoint e Método
PUT /api/users/profile

### Descrição
Atualiza login e/ou senha do usuário autenticado.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Body (JSON):
  - login (string, opcional)
  - oldPassword (string, obrigatório se enviar newPassword)
  - newPassword (string, opcional)

### Exemplo de Resposta (Sucesso)
Status: 200

```json
{
  "message": "Perfil atualizado com sucesso!"
}
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "Nenhum dado fornecido para atualização."
}
```

Status: 500

```json
{
  "error": "Erro interno no servidor."
}
```

---

### Endpoint e Método
DELETE /api/users/profile

### Descrição
Exclui a conta do usuário autenticado após confirmação de senha.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Body (JSON):
  - senha (string, obrigatório)

### Exemplo de Resposta (Sucesso)
Status: 200

```json
{
  "message": "Conta deletada com sucesso."
}
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "A senha é obrigatória para confirmar a exclusão."
}
```

Status: 500

```json
{
  "error": "Erro interno no servidor."
}
```

---

## 2. Listas

### Endpoint e Método
POST /api/listas/gerar

### Descrição
Gera uma lista de questões aleatórias com base nos critérios enviados e cria uma atividade vinculada ao usuário logado.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Body (JSON):
  - quantidade (number, obrigatório)
  - disciplinas (array de number, obrigatório)
  - nome (string, opcional)
  - descricao (string, opcional)
  - disciplina_cod (number, obrigatório)

### Exemplo de Resposta (Sucesso)
Status: 200

```json
{
  "atividade_cod": 45,
  "questoes": [
    {
      "cod": 101,
      "descricao": "Qual a capital do Brasil?",
      "imagem_url": null,
      "explicacao": "Conteúdo de geografia.",
      "tema_cod": 3,
      "disciplina_cod": 4,
      "autor": "Equipe",
      "ano": 2024,
      "alternativas": [
        { "cod": 1, "texto": "Brasília", "correta": true },
        { "cod": 2, "texto": "São Paulo", "correta": false }
      ]
    }
  ]
}
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "Dados incompletos."
}
```

Status: 500

```json
{
  "error": "Erro interno no servidor."
}
```

---

### Endpoint e Método
GET /api/listas/:id

### Descrição
Retoma uma lista já criada pelo ID da atividade.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - id (number, obrigatório)

### Exemplo de Resposta (Sucesso)
Status: 200

```json
{
  "atividade_cod": 45,
  "nome": "Lista de Exercícios - 13/04/2026",
  "descricao": "Lista de revisão",
  "disciplina": "Matemática",
  "quantidade": 2,
  "questoes": [
    {
      "cod": 101,
      "descricao": "2 + 2 = ?",
      "alternativas": [
        { "cod": 10, "texto": "4", "correta": true },
        { "cod": 11, "texto": "5", "correta": false }
      ]
    }
  ]
}
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "Parâmetro id inválido."
}
```

Status: 500

```json
{
  "error": "Erro ao buscar lista"
}
```

---

## 3. Questões

### Endpoint e Método
POST /api/questoes

### Descrição
Cria uma nova questão com alternativas. Rota protegida e exclusiva para administrador.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
  - Content-Type: multipart/form-data
- Body (multipart/form-data):
  - descricao (string, obrigatório)
  - alternativas (JSON string ou array, obrigatório)
  - disciplina_cod (number, obrigatório)
  - explicacao (string, opcional)
  - autor (string, opcional)
  - ano (number, opcional)
  - imagem (file, opcional)
  - imagem_url (string, opcional)
  - tema_cod (number, opcional)

Exemplo de alternativas:

```json
[
  { "texto": "Alternativa A", "correta": false },
  { "texto": "Alternativa B", "correta": true }
]
```

### Exemplo de Resposta (Sucesso)
Status: 201

```json
{
  "cod": 99,
  "descricao": "Qual alternativa está correta?",
  "disciplina_cod": 2,
  "explicacao": "Explicação da resposta",
  "autor": "Professor",
  "ano": 2026,
  "tema_cod": 7,
  "imagem_url": "1744567890123-imagem.png",
  "alternativas": [
    { "cod": 201, "texto": "A", "correta": false, "questao_cod": 99 },
    { "cod": 202, "texto": "B", "correta": true, "questao_cod": 99 }
  ]
}
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "Formato das alternativas inválido."
}
```

Status: 500

```json
{
  "error": "Erro interno no servidor."
}
```

---

### Endpoint e Método
DELETE /api/questoes/:cod

### Descrição
Exclui uma questão pelo código e remove a imagem física associada, se existir. Rota protegida e exclusiva para administrador.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - cod (number, obrigatório)

### Exemplo de Resposta (Sucesso)
Status: 200

```json
{
  "message": "Questão 99 e sua imagem, caso tivesse, foram deletadas."
}
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "Parâmetro cod inválido."
}
```

Status: 500

```json
{
  "error": "Erro interno no servidor."
}
```

---

## 4. Disciplinas

### Endpoint e Método
GET /api/disciplinas

### Descrição
Retorna todas as disciplinas ordenadas por descrição.

### Parâmetros
- Não exige Body, Headers de autenticação, Query params ou Path params.

### Exemplo de Resposta (Sucesso)
Status: 200

```json
[
  { "cod": 3, "descricao": "Ciências da Natureza" },
  { "cod": 4, "descricao": "Ciências Humanas" },
  { "cod": 2, "descricao": "Matemática" },
  { "cod": 1, "descricao": "Português" }
]
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "Requisição inválida."
}
```

Status: 500

```json
{
  "error": "Erro interno no servidor."
}
```

---

## 5. Estatísticas Gerais

### Endpoint e Método
GET /api/estatisticas/gerais

### Descrição
Retorna as estatísticas consolidadas de desempenho do usuário logado (questões respondidas, acertos, erros, etc). A linha correspondente do banco é criada ao registrar o usuário.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)

### Exemplo de Resposta (Sucesso)
Status: 200

```json
{
  "cod": 1,
  "usuario_cod": 12,
  "total_questoes_respondidas": 50,
  "total_acertos": 35,
  "total_erros": 15,
  "aproveitamento_geral": "70.00",
  "total_listas_finalizadas": 3,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### Exemplo de Resposta (Erro)
Status: 404

```json
{
  "error": "Estatísticas não encontradas para este usuário."
}
```

---

## 6. Ações em Listas/Simulados

### Endpoint e Método
POST /api/listas/responder

### Descrição
Registra a resposta dada pelo usuário em uma questão de uma lista em andamento e atualiza as estatísticas gerais de acertos e erros em tempo real (apenas na primeira vez que a questão é respondida).

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Body (JSON):
  - atividade_cod (number, obrigatório)
  - questao_cod (number, obrigatório)
  - alternativa_cod (number, obrigatório)

### Exemplo de Resposta (Sucesso)
Status: 200

```json
{
  "message": "Resposta registrada e estatísticas atualizadas!",
  "correta": true
}
```

### Exemplo de Resposta (Erro)
Status: 403

```json
{
  "error": "Acesso negado. Esta atividade não pertence a você."
}
```

---

### Endpoint e Método
POST /api/listas/:id/finalizar

### Descrição
Encerra a lista em andamento e computa a visualização no histórico, incrementando também as estatísticas de fechamento de listas no perfil.

### Parâmetros
- Headers:
  - Authorization: Bearer <token> (obrigatório)
- Path params:
  - id (number, obrigatório) — ID numérico correspondente à atividade/lista

### Exemplo de Resposta (Sucesso)
Status: 200

```json
{
  "message": "Lista finalizada com sucesso!",
  "pontuacao": 8.5,
  "acertos": 17,
  "total": 20
}
```

### Exemplo de Resposta (Erro)
Status: 400

```json
{
  "error": "Atividade sem questões não pode ser finalizada."
}
```

---

## Observações Importantes
- Algumas rotas retornam 401, 403, 404 e 409 em casos específicos (token inválido, falta de permissão, recurso não encontrado, conflito de cadastro).
- Os exemplos de erro com 400 mostrados acima seguem o formato solicitado e representam cenários comuns de validação.
- Para rotas protegidas, sem token válido a API retorna erro de autenticação.
