// Página pública em /ajuda, aberta sem login, com o passo a passo de uso do sistema.
// Os nomes dos botões aqui precisam ser os mesmos das telas.
function HelpGuide() {
  return (
    <main>
      <article className="privacy-policy help-guide" aria-labelledby="help-title">
        <h1 id="help-title">Como usar o Sistema de Orçamentos</h1>
        <p>
          O sistema ajuda o prestador de serviços a montar orçamentos, enviar um link para o cliente e acompanhar a resposta. O cliente não
          precisa criar conta: ele só abre o link.
        </p>

        <nav aria-label="Tópicos da ajuda">
          <ul>
            <li><a href="#primeiros-passos">Primeiros passos</a></li>
            <li><a href="#clientes">Clientes</a></li>
            <li><a href="#novo-orcamento">Criar um orçamento</a></li>
            <li><a href="#enviar">Revisar, confirmar e enviar</a></li>
            <li><a href="#respostas">Acompanhar as respostas</a></li>
            <li><a href="#gestao">Gestão</a></li>
            <li><a href="#conta">Minha conta e acessibilidade</a></li>
            <li><a href="#duvidas">Perguntas frequentes</a></li>
          </ul>
        </nav>

        <h2 id="primeiros-passos">Primeiros passos</h2>
        <ol>
          <li>Clique em <strong>Entrar no sistema</strong> e use sua conta Google ou um e-mail e senha.</li>
          <li>
            Abra o <strong>Perfil profissional</strong> e preencha nome, e-mail e telefone. CPF ou CNPJ e endereço são opcionais. Esses dados
            aparecem para o cliente no orçamento.
          </li>
          <li>Se quiser, envie o <strong>logo da empresa</strong> na mesma tela. Ele aparece no topo do orçamento que o cliente abre.</li>
        </ol>
        <p>Sem o perfil profissional preenchido, o sistema não deixa confirmar orçamentos.</p>

        <h2 id="clientes">Clientes</h2>
        <ol>
          <li>
            Em <strong>Clientes</strong>, clique em <strong>Novo cliente</strong> e informe nome, e-mail, telefone e endereço. Depois de salvar,
            o botão <strong>Criar orçamento para…</strong> abre um orçamento novo com esse cliente já escolhido.
          </li>
          <li>Use <strong>Editar cliente</strong> para corrigir dados. Os orçamentos já enviados guardam os dados da época em que foram criados.</li>
          <li>
            <strong>Inativar cliente</strong> tira o cliente da lista de novos orçamentos sem apagar o histórico.{' '}
            <strong>Excluir cliente</strong> só é possível quando ele não tem orçamentos.
          </li>
        </ol>

        <h2 id="novo-orcamento">Criar um orçamento</h2>
        <ol>
          <li>Em <strong>Novo orçamento</strong>, escolha o cliente e escreva a descrição geral do serviço.</li>
          <li>
            Escolha a forma de cobrança: <strong>Preço por item</strong> (o total é calculado pelos itens) ou <strong>Valor global</strong>{' '}
            (você informa o total).
          </li>
          <li>
            Adicione os itens com <strong>+ Adicionar outro item</strong>. Linhas deixadas em branco são ignoradas. Se a descrição já
            lista as peças, use <strong>Separar a descrição em itens com IA</strong>: a IA sugere os itens e as quantidades, você confere
            e clica em <strong>Usar itens</strong>; os preços continuam com você. No <strong>Valor global</strong>, se o serviço for um
            item só, use <strong>Usar a descrição geral como item</strong>.
          </li>
          <li>Informe a data prevista e o endereço do serviço e, se precisar, observações do local.</li>
          <li>
            Opcional: clique em <strong>Revisar descrição com IA</strong> para receber uma sugestão de texto mais claro. Nada muda até você
            clicar em <strong>Usar sugestão</strong>.
          </li>
          <li>Clique em <strong>Salvar rascunho</strong>. O rascunho ainda pode ser editado à vontade.</li>
        </ol>

        <h2 id="enviar">Revisar, confirmar e enviar</h2>
        <ol>
          <li>Em <strong>Meus orçamentos</strong>, clique em <strong>Revisar orçamento</strong> no rascunho e confira todos os dados.</li>
          <li>
            Clique em <strong>Confirmar e gerar link</strong>. A partir daqui o orçamento não pode mais ser alterado, para o cliente ver
            exatamente o que foi combinado.
          </li>
          <li>
            Envie o link pelo <strong>WhatsApp</strong> ou por <strong>e-mail</strong>, com a mensagem já pronta, ou use{' '}
            <strong>Copiar link</strong> para mandar por outro canal. O sistema não envia mensagens sozinho.
          </li>
        </ol>
        <p>O cliente abre o link, vê o orçamento e escolhe <strong>Aceitar orçamento</strong> ou <strong>Recusar orçamento</strong>, podendo explicar o motivo.</p>

        <h2 id="respostas">Acompanhar as respostas</h2>
        <ul>
          <li>
            Quando um cliente responde, o quadro <strong>Respostas dos clientes</strong> aparece na tela inicial. Clique em{' '}
            <strong>Abrir orçamento</strong> para ir direto a ele, ou em <strong>Marcar como vistas</strong> depois de conferir.
          </li>
          <li>
            Em <strong>Meus orçamentos</strong>, filtre por cliente, situação e data. O campo de busca também aceita o número do orçamento,
            como 2572 ou 002572.
          </li>
          <li>Clique em <strong>Ver histórico</strong> para ver tudo o que aconteceu com um orçamento.</li>
          <li>
            Se o cliente recusar, use <strong>Criar correção</strong>: um novo rascunho é criado a partir do recusado, que continua guardado
            como estava.
          </li>
        </ul>

        <h2 id="gestao">Gestão</h2>
        <p>
          A tela <strong>Gestão</strong> mostra os números do período escolhido (mês, trimestre, ano ou todo o período): orçamentos por
          situação, taxa de aceite, valores aceitos e em aberto, tempo médio de resposta, orçamentos aguardando resposta há mais tempo e
          principais clientes.
        </p>

        <h2 id="conta">Minha conta e acessibilidade</h2>
        <ul>
          <li>
            Em <strong>Minha conta</strong> você vê seus dados, a forma de acesso e as atividades recentes. Quem entra com e-mail e senha
            pode usar <strong>Alterar senha</strong>; quem entra com o Google troca a senha na própria conta Google.
          </li>
          <li>
            No topo de todas as páginas, <strong>A−</strong> e <strong>A+</strong> mudam o tamanho do texto e{' '}
            <strong>Alto contraste</strong> deixa a tela em preto, branco e amarelo.
          </li>
        </ul>

        <h2 id="duvidas">Perguntas frequentes</h2>
        <h3>O cliente precisa criar conta?</h3>
        <p>Não. Quem recebe o link consegue ver o orçamento e respondê-lo. Por isso, envie o link só para o cliente.</p>

        <h3>Posso mudar um orçamento já enviado?</h3>
        <p>Não. Se o cliente recusar, crie uma correção. Se ainda não houve resposta, combine com o cliente e crie um novo orçamento.</p>

        <h3>O cliente pode mudar a resposta?</h3>
        <p>Não. Cada orçamento recebe uma única resposta pelo link.</p>

        <h3>Meus dados ficam visíveis para outros prestadores?</h3>
        <p>
          Não. Cada prestador vê apenas os próprios clientes e orçamentos. Mais detalhes na{' '}
          <a href="/privacidade">política de privacidade</a>.
        </p>

        <p><a href="/">Voltar ao Sistema de Orçamentos</a></p>
      </article>
    </main>
  );
}

export default HelpGuide;
