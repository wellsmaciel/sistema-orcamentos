# Sistema de Orçamentos

Aplicação web responsiva para criação, envio e acompanhamento de orçamentos, destinada a prestadores de serviços autônomos e pequenas empresas.

O sistema permitirá cadastrar clientes, criar orçamentos, compartilhar um link para consulta e registrar a aceitação ou recusa pelo cliente. Correções deverão preservar o histórico do orçamento anterior.

## Estrutura do repositório

sistema-orcamentos/

- frontend/ # Aplicação web
- backend/ # API e regras de negócio
- docs/ # Documentação técnica e diagramas
- .github/ # Configuração futura do GitHub Actions
- .gitignore
- README.md

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

### Testes

- Jest para testes de unidade
- Jest e Supertest para testes de integração
- Cypress para testes de aceite

### Controle de versão e automação

- Git
- GitHub
- GitHub Actions

## Instalação

As instruções de instalação serão adicionadas após a inicialização do frontend e do backend.

## Execução

Os comandos para executar a aplicação e o banco de dados serão documentados durante a configuração do ambiente de desenvolvimento.

## Testes

Os comandos para execução dos testes serão adicionados conforme as ferramentas de teste forem configuradas.

## Variáveis de ambiente

As variáveis necessárias serão documentadas em arquivos `.env.example`, sem incluir senhas, tokens ou outras informações confidenciais.

## Decisões pendentes

- Provedor de autenticação gerenciada
- Provedor de computação em nuvem
- Serviço de envio de e-mails
- Serviço de armazenamento de imagens
- Ferramenta de infraestrutura como código
