# Sistema de Orçamentos

Aplicação web responsiva para criação, envio e acompanhamento de orçamentos, destinada a prestadores de serviços autônomos e pequenas empresas.

O sistema permite cadastrar clientes, criar orçamentos, compartilhar um link para consulta e registrar a aceitação ou recusa pelo cliente. As correções preservam o histórico do orçamento anterior.

O prestador pode consultar o histórico de eventos de cada orçamento: criação, alterações do rascunho, confirmação, resposta do cliente e criação de correção. O registro começa com a implantação dessa funcionalidade; alterações anteriores não podem ser reconstruídas.

Ao criar ou editar um rascunho, o prestador pode pedir uma revisão da descrição com IA. A API envia somente a descrição e os itens ao modelo Claude, da Anthropic, e devolve uma sugestão; a descrição só muda se o prestador usar a sugestão. Dados do cliente não são enviados, e cada prestador pode pedir até 10 revisões a cada 10 minutos.

## Funcionalidades

- Cadastro completo de clientes: criação, consulta e busca, edição, exclusão, inativação e reativação.
- Orçamento e itens na mesma tela, com preço por item (total calculado) ou valor global (total informado).
- Revisão completa antes de confirmar, link público para o cliente aceitar ou recusar, motivo da recusa e correção vinculada ao orçamento anterior.
- Logo da empresa no perfil profissional (PNG, JPEG ou WebP, reduzido no navegador para até 200 KB), exibido no topo do link público.
- Histórico de eventos de cada orçamento.
- Revisão da descrição com IA e separação da descrição em itens com IA (a IA sugere itens e quantidades; os preços ficam com o prestador).
- Preços aceitos no formato brasileiro, como "1.200,50" ou "R$ 1.200".
- Envio do link pelo WhatsApp ou por e-mail do próprio prestador, com mensagem pronta; o app não envia mensagens sozinho.
- Aviso na tela inicial quando um cliente aceita ou recusa um orçamento, com atalho para abrir cada orçamento respondido.
- Busca de orçamentos pelo nome do cliente ou pelo número do orçamento.
- Guia de uso público em `/ajuda`, com link no rodapé e na tela de entrada.
- Área de gestão com indicadores do período: orçamentos por situação, taxa de aceite, valores aceito e em aberto, tempo médio de resposta, orçamentos aguardando resposta e principais clientes.
- Registro das ações do prestador sobre clientes e perfil profissional.
- Minha conta: dados do usuário, forma de acesso e troca de senha para contas de e-mail e senha.
- Telefones brasileiros validados e padronizados no formato "(21) 99999-8888".
- Interface mobile first: menu em blocos no celular e barra de navegação, listas em duas colunas e formulários em duas colunas a partir de 1024 px.
- Acessibilidade: ajuste do tamanho do texto e modo de alto contraste.

## Estrutura do repositório

sistema-orcamentos/

- `frontend/` — Aplicação web
- `backend/` — API e regras de negócio
- `docs/` — Documentação técnica (especificação OpenAPI da API)
- `.github/` — Workflow de integração contínua
- `.railway/` — Infraestrutura como código do Railway
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

### Inteligência artificial

- API do Claude (Anthropic), pelo SDK oficial `@anthropic-ai/sdk`
- Modelo `claude-haiku-4-5`, o mais econômico da Anthropic, suficiente para revisar textos curtos

### Testes

- Jest para testes de unidade e de integração do backend, com PostgreSQL real no CI
- Supertest para testes das rotas da API
- `node:test` para testes de unidade do frontend, incluindo testes de contrato com as validações do backend
- Playwright para testes automatizados de aceite da interface, no navegador, com as respostas da API simuladas
- Testes manuais no ambiente publicado depois de cada publicação

### Controle de versão e automação

- Git
- GitHub, com a branch `main` protegida: toda mudança entra por pull request e só depois que os três jobs do CI passam
- GitHub Actions
- Railway para publicação contínua
- Infraestrutura como código com `railway/iac` e o CLI do Railway

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
npm run test:unit
npm run test:acceptance
npm run build
```

Localmente, os testes de aceite usam o Google Chrome instalado no computador. No CI, o GitHub Actions instala o Chromium do Playwright.

As verificações também são executadas automaticamente pelo GitHub Actions em três jobs:

- **Frontend - lint e build:** lint, testes de unidade, testes de aceite com Playwright e build.
- **Backend - migrations e testes:** migrations em um PostgreSQL de teste e testes de unidade e integração.
- **Infraestrutura - plano do Railway:** compara `.railway/railway.ts` com o ambiente de produção (`railway config plan --detailed-exit-code`) e falha se houver diferença. O job nunca aplica mudanças.

## Logs e auditoria

- **Requisições:** a API escreve uma linha JSON por requisição na saída padrão, coletada pelo Railway, com método, padrão da rota, status, duração, identificador da requisição e identificador do usuário. O endereço real não é registrado, para que tokens de links públicos e dados pessoais não cheguem aos logs. Cada resposta traz o cabeçalho `X-Request-Id`, também presente nos logs de erro.
- **Ações dos usuários:** criação, edição, exclusão, inativação e reativação de clientes e alterações do perfil profissional (inclusive troca e remoção do logo) ficam em `activity_logs`, com os nomes dos campos alterados e nunca os valores.
- **Orçamentos:** cada orçamento tem seu histórico de eventos em `quote_events`.
- **IA:** cada revisão registra o modelo, os tokens usados e a duração, sem o texto do prestador.

## Cabeçalhos de segurança

- **API:** `helmet` envia HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options` e `Referrer-Policy: no-referrer`, e remove `X-Powered-By`. `Cross-Origin-Resource-Policy` fica `cross-origin` porque o site exibe o logo servido pela API.
- **Site:** `frontend/public/serve.json` configura o `serve` usado no Railway: o site não pode ser exibido dentro de frames de outros sites (`frame-ancestors 'none'`, proteção contra clickjacking no link do orçamento), além de HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (o token do link público não vai para outros sites) e `Permissions-Policy`.

## Variáveis de ambiente

As variáveis necessárias estão documentadas nos seguintes arquivos:

- `backend/.env.example`
- `frontend/.env.example`

Os arquivos `.env` reais não devem ser enviados ao GitHub, pois podem conter credenciais e configurações privadas.

A revisão da descrição com IA depende de `ANTHROPIC_API_KEY` no backend. Sem essa variável, a API responde que o recurso não está disponível e o restante do sistema funciona normalmente.

No Railway, os valores são cadastrados na aba `Variables` de cada serviço. Os nomes das variáveis também estão declarados em `.railway/railway.ts` com `preserve()`, que mantém o valor do Railway sem escrevê-lo no código.

O job de infraestrutura do CI usa o secret `RAILWAY_TOKEN` do GitHub, um token de projeto do ambiente de produção.

## Publicação

A aplicação está publicada no Railway:

- Frontend: https://frontend-production-dd49.up.railway.app
- Verificação da API: https://backend-production-4ec1.up.railway.app/health
- Banco de dados: PostgreSQL gerenciado pelo Railway
- Autenticação: Auth0

O frontend e o backend são publicados como serviços separados. O Railway monitora a branch `main` e aguarda a conclusão bem-sucedida do GitHub Actions antes de iniciar um novo deployment.

As migrations do banco são executadas automaticamente antes da inicialização de uma nova versão do backend.

### Infraestrutura como código

Os serviços, o banco de dados, os domínios, as etapas de build e pre-deploy e os nomes das variáveis estão descritos em `.railway/railway.ts`. O CI compara esse arquivo com a produção a cada pull request e a cada push na `main`. Como o Railway só publica depois que todos os jobs passam, uma diferença entre o arquivo e a produção bloqueia a publicação.

Regra de trabalho: toda mudança feita no painel do Railway deve ser refletida no `.railway/railway.ts` no mesmo pull request.

Para aplicar uma mudança do arquivo na produção, de forma manual e revisada:

```bash
railway config plan
railway config apply
```

## Decisões pendentes e próximos passos

- Serviço de envio automático de e-mails (depende de domínio próprio)
- Serviço de armazenamento de imagens, para o logo da empresa
- Domínio próprio
- Empresa com administrador, colaboradores e permissões (planejado)
- Tema claro e escuro
