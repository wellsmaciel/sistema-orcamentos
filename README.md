# Sistema de Orçamentos

Aplicação web responsiva para criação, envio e acompanhamento de orçamentos, destinada a prestadores de serviços autônomos e pequenas empresas.

O sistema permite cadastrar clientes, criar orçamentos, compartilhar um link para consulta e registrar a aceitação ou recusa pelo cliente. As correções preservam o histórico do orçamento anterior.

O prestador pode consultar o histórico de eventos de cada orçamento: criação, alterações do rascunho, confirmação, resposta do cliente e criação de correção. O registro começa com a implantação dessa funcionalidade; alterações anteriores não podem ser reconstruídas.

## Estrutura do repositório

sistema-orcamentos/

- `frontend/` — Aplicação web
- `backend/` — API e regras de negócio
- `docs/` — Documentação técnica e diagramas
- `.github/` — Workflows de integração contínua
- `.gitignore`
- `README.md`

## Tecnologias confirmadas

### Frontend

- React
- Vite
- JavaScript
- npm

### Backend

- Node.js
- Express
- JavaScript com ES Modules
- API REST
- OpenAPI

### Banco de dados

- PostgreSQL
- Sequelize v6
- Docker Compose para execução local do PostgreSQL

### Autenticação e autorização

- Auth0
- Universal Login
- Acesso por e-mail e senha
- Acesso por Conta Google
- OAuth e OpenID Connect
- Tokens de acesso para proteção da API

### Testes

- Jest para testes de unidade
- Jest e Supertest para testes de integração
- Testes manuais de aceite no ambiente publicado

### Controle de versão e automação

- Git
- GitHub
- GitHub Actions
- Railway para publicação contínua

## Instalação

### Requisitos

- Node.js e npm
- Docker e Docker Compose
- Uma aplicação do tipo Single Page Application configurada no Auth0

### Banco de dados local

Na raiz do repositório, inicie o PostgreSQL:

```bash
docker compose up -d
```

### Backend

Na pasta `backend`, instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` com base em `.env.example` e configure as variáveis necessárias.

Execute as migrations:

```bash
npm run db:migrate
```

Inicie a API:

```bash
npm run dev
```

A API ficará disponível em `http://localhost:3000`. O endpoint de verificação é `GET /health`.

### Frontend

Na pasta `frontend`, instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` com base em `.env.example` e configure as variáveis necessárias.

Inicie o frontend:

```bash
npm run dev
```

O frontend ficará disponível em `http://localhost:5173`.

## Testes e verificações

Na pasta `backend`:

```bash
npm test
```

Na pasta `frontend`:

```bash
npm run lint
npm run build
```

As verificações também são executadas automaticamente pelo GitHub Actions.

## Variáveis de ambiente

As variáveis necessárias estão documentadas nos seguintes arquivos:

- `backend/.env.example`
- `frontend/.env.example`

Os arquivos `.env` reais não devem ser enviados ao GitHub, pois podem conter credenciais e configurações privadas.

No Railway, as configurações são cadastradas diretamente na aba `Variables` de cada serviço.

## Publicação

A aplicação está publicada no Railway:

- Frontend: https://frontend-production-dd49.up.railway.app
- Verificação da API: https://backend-production-4ec1.up.railway.app/health
- Banco de dados: PostgreSQL gerenciado pelo Railway
- Autenticação: Auth0

O frontend e o backend são publicados como serviços separados. O Railway monitora a branch `main` e aguarda a conclusão bem-sucedida do GitHub Actions antes de iniciar um novo deployment.

As migrations do banco são executadas automaticamente antes da inicialização de uma nova versão do backend.

## Decisões pendentes

- Serviço de envio de e-mails
- Serviço de armazenamento de imagens
- Ferramenta de infraestrutura como código
- Domínio próprio
