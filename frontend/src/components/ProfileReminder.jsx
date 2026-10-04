import { useEffect, useState } from 'react';
import { requestCompany } from '../services/company.js';

// Enquanto o perfil profissional não existe, lembra que ele é necessário para enviar orçamentos.
// Não bloqueia nada: clientes e rascunhos podem ser criados antes.
function ProfileReminder({ getAccessTokenSilently, onOpenProfile }) {
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    let ignoreResult = false;

    requestCompany(getAccessTokenSilently)
      .then((company) => {
        if (!ignoreResult) {
          setIsMissing(!company);
        }
      })
      .catch(() => {
        // Sem conseguir consultar, o aviso não aparece; a confirmação do orçamento continua avisando.
      });

    return () => {
      ignoreResult = true;
    };
  }, [getAccessTokenSilently]);

  if (!isMissing) {
    return null;
  }

  return (
    <section className="profile-reminder" aria-labelledby="profile-reminder-title">
      <h2 id="profile-reminder-title">Preencha seu perfil profissional</h2>
      <p>
        Antes de enviar seu primeiro orçamento, informe seu nome, e-mail e telefone. Esses dados aparecem para o cliente, e o envio só
        é liberado depois que o perfil estiver salvo.
      </p>
      <button type="button" className="button-primary" onClick={onOpenProfile}>
        Preencher perfil
      </button>
    </section>
  );
}

export default ProfileReminder;
