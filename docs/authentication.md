# Autenticação PlayTalk (PostgreSQL + bcrypt + JWT)

## Arquitetura
- `api/users/register`: cria usuário no PostgreSQL com senha hash (`bcrypt`).
- `api/users/login`: valida senha com `bcrypt.compare` e retorna JWT.
- `api/users/index`: endpoint protegido por JWT para obter o perfil autenticado.
- `api/users/update`: endpoint protegido por JWT para atualizar perfil/senha do próprio usuário.
- `api/_utils/db.js`: camada simples de acesso ao PostgreSQL.
- `api/_utils/auth.js`: criação e validação de JWT (Bearer Token).

## Variáveis de ambiente (Render)
- `DATABASE_URL`: URL de conexão PostgreSQL do Render.
- `JWT_SECRET`: segredo forte para assinar o token JWT.
- `JWT_EXPIRES_IN`: validade do token (ex.: `7d`).
- `BCRYPT_ROUNDS`: custo do bcrypt (recomendado: `12`).
- `PGSSL`: `true` para forçar SSL quando necessário.

## Endpoints

### POST `/api/users/register`
Body:
```json
{
  "username": "seu_usuario",
  "password": "senha-forte-8+"
}
```

Resposta `201`:
```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "key": "seu_usuario_normalizado",
    "username": "seu_usuario",
    "data": {}
  }
}
```

### POST `/api/users/login`
Body:
```json
{
  "username": "seu_usuario",
  "password": "senha"
}
```

Resposta `200`: mesmo formato de `register`.

### GET `/api/users`
Headers:
- `Authorization: Bearer <jwt>`

Retorna o usuário autenticado.

### POST `/api/users/update`
Headers:
- `Authorization: Bearer <jwt>`

Body:
```json
{
  "key": "usuario_normalizado",
  "username": "novo_nome_opcional",
  "password": "nova_senha_opcional",
  "data": { "points": 100 }
}
```

## Checklist Render
1. Definir env vars (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BCRYPT_ROUNDS`, `PGSSL`).
2. Rodar `sql/auth_schema.sql` no banco PostgreSQL do Render.
3. Fazer deploy.
4. Validar `POST /api/users/register`, `POST /api/users/login` e rota protegida com Bearer.

## Segurança
- Nunca retornar `password_hash` na API.
- JWT assinado com segredo forte e expiração.
- Senha sempre hash com bcrypt.
- Bloqueio de atualização de outro usuário (token deve casar com `key`).
- Recomenda-se adicionar rate limiting para rotas de login em camada de edge/reverse proxy.

## Aplicação no site (front-end)
- Script cliente: `js/auth-client.js`.
- Incluído em: `index.html`, `fun.html` e `play.html`.
- Comportamento:
  - adiciona botão `Entrar` no header.
  - abre modal com abas de Login/Cadastro.
  - salva `token` e `user` no `localStorage`.
  - envia `Authorization: Bearer <token>` nas rotas protegidas.
  - em logout limpa sessão local.
- Persistência simples no Postgres:
  - ao alterar configurações/armazenamento local, o cliente agenda `POST /api/users/update`.
  - o backend persiste em `users.data` (JSONB), mantendo compatibilidade com progresso já existente.
