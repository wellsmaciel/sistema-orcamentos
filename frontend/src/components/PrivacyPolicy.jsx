const CONTACT_EMAIL = 'wellsvelasquezmaciel@gmail.com';
const LAST_UPDATED = '2 de outubro de 2026';

// Página pública em /privacidade, aberta sem login. O texto descreve o que o sistema faz de fato.
function PrivacyPolicy() {
  return (
    <main>
      <article className="privacy-policy" aria-labelledby="privacy-title">
        <h1 id="privacy-title">Política de privacidade</h1>
        <p>Última atualização: {LAST_UPDATED}.</p>

        <h2>Quem somos</h2>
        <p>
          O Sistema de Orçamentos é um projeto acadêmico, desenvolvido como Trabalho de Conclusão de Curso da pós-graduação em
          Desenvolvimento Full Stack da PUC Minas. O responsável pelo projeto e pelos dados tratados nele é Wells Velasquez Maciel,
          que pode ser contatado pelo e-mail <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>Quais dados guardamos</h2>
        <ul>
          <li><strong>Conta:</strong> nome, e-mail e o identificador da conta no serviço de login.</li>
          <li><strong>Perfil profissional:</strong> nome profissional ou da empresa, e-mail, telefone e, se informados, CPF ou CNPJ, endereço e logo da empresa.</li>
          <li><strong>Clientes cadastrados pelo prestador:</strong> nome, e-mail, telefone e endereço.</li>
          <li><strong>Orçamentos:</strong> descrição, itens, valores, data e endereço do serviço, resposta do cliente e, em caso de recusa, o motivo informado.</li>
          <li>
            <strong>Registros técnicos:</strong> um registro de cada acesso à API, sem o endereço completo, tokens ou dados pessoais;
            o histórico de cada orçamento; e as ações feitas sobre clientes e perfil, com os nomes dos campos alterados, nunca os valores.
          </li>
        </ul>

        <h2>Para que usamos</h2>
        <p>
          Para criar, enviar e acompanhar orçamentos, mostrar os indicadores da área de gestão, manter a segurança do sistema e
          registrar o histórico das ações. Os dados não são vendidos nem usados para publicidade.
        </p>

        <h2>Com quem os dados são compartilhados</h2>
        <ul>
          <li><strong>Auth0:</strong> realiza o cadastro, o login e a troca de senha.</li>
          <li><strong>Google:</strong> somente para quem escolhe entrar com a conta Google.</li>
          <li>
            <strong>Anthropic:</strong> quando o prestador clica em &quot;Revisar descrição com IA&quot; ou &quot;Separar a descrição em
            itens com IA&quot;, apenas a descrição e os itens do orçamento são enviados para gerar uma sugestão (na separação em itens,
            só a descrição). Dados do cliente não são enviados.
          </li>
          <li><strong>Railway:</strong> hospeda o aplicativo e o banco de dados.</li>
          <li>
            <strong>Link público do orçamento:</strong> quem tiver o link consegue ver o orçamento, com o logo atual da empresa, e respondê-lo. O prestador decide com quem
            compartilha o link.
          </li>
        </ul>

        <h2>Mensagens e e-mails</h2>
        <p>
          O sistema não envia e-mails nem mensagens aos clientes por conta própria. Os botões de WhatsApp e de e-mail abrem o aplicativo do
          próprio prestador, que decide se envia a mensagem. Os e-mails de conta, como a troca de senha, são enviados pelo Auth0.
        </p>

        <h2>Cookies e armazenamento no navegador</h2>
        <p>
          O login usa um cookie de sessão do Auth0 e guarda no seu navegador os códigos de acesso da sessão, para que você continue
          conectado ao recarregar a página. Eles são apagados ao clicar em &quot;Sair&quot;. As preferências de tamanho do texto e de
          alto contraste também ficam salvas apenas no seu navegador. Não usamos cookies de publicidade nem de rastreamento.
        </p>

        <h2>Dados de clientes</h2>
        <p>
          Os dados dos clientes são cadastrados pelo prestador, que deve ter autorização para usá-los. O cliente pode pedir a correção ou a
          exclusão dos seus dados diretamente ao prestador ou pelo e-mail de contato desta página.
        </p>

        <h2>Seus direitos e como exercê-los</h2>
        <p>
          De acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode pedir a confirmação de que tratamos seus dados, o
          acesso, a correção, a exclusão e informações sobre o compartilhamento. Envie o pedido para{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Respondemos em até 15 dias.
        </p>

        <h2>Por quanto tempo guardamos</h2>
        <p>
          Os dados ficam guardados enquanto a conta existir ou até um pedido de exclusão. Por ser um projeto acadêmico, o serviço pode ser
          encerrado depois da avaliação; nesse caso, os dados serão excluídos.
        </p>

        <h2>Segurança</h2>
        <p>
          O acesso é feito por conexão segura (HTTPS), cada prestador só acessa os próprios dados e as senhas são guardadas pelo Auth0, nunca
          pelo sistema. Nenhum sistema é totalmente imune a falhas; se ocorrer um incidente que afete seus dados, você será avisado.
        </p>

        <p><a href="/">Voltar ao Sistema de Orçamentos</a></p>
      </article>
    </main>
  );
}

export default PrivacyPolicy;
