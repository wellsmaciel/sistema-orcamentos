import { useEffect, useRef, useState } from 'react';

import { removeCompanyLogo, requestCompanyLogo, saveCompanyLogo } from '../services/company-logo.js';
import { ALLOWED_LOGO_TYPES, prepareLogo, validateLogoFile } from '../utils/company-logo.js';

// Logo exibido no orçamento enviado ao cliente. Tem botões próprios, separados do formulário do perfil.
function CompanyLogoField({ getAccessTokenSilently, hasCompany, hasLogo }) {
  const [currentLogo, setCurrentLogo] = useState(null);
  const [pendingLogo, setPendingLogo] = useState(null);
  const [isLoading, setIsLoading] = useState(hasLogo);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!hasLogo) {
      return undefined;
    }

    let ignoreResult = false;

    requestCompanyLogo(getAccessTokenSilently)
      .then((blob) => {
        if (!ignoreResult && blob) {
          setCurrentLogo(URL.createObjectURL(blob));
        }
      })
      .catch((requestError) => {
        if (!ignoreResult) {
          setErrorMessage(requestError.message);
        }
      })
      .finally(() => {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [getAccessTokenSilently, hasLogo]);

  // Libera da memória as imagens que deixaram de aparecer na tela.
  useEffect(() => () => currentLogo && URL.revokeObjectURL(currentLogo), [currentLogo]);
  useEffect(() => () => pendingLogo && URL.revokeObjectURL(pendingLogo.url), [pendingLogo]);

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    setErrorMessage('');
    setSuccessMessage('');

    if (!file) {
      return;
    }

    const validationError = validateLogoFile(file);

    if (validationError) {
      setErrorMessage(validationError);
      clearFileInput();
      return;
    }

    try {
      setIsBusy(true);
      const blob = await prepareLogo(file);
      setPendingLogo({ blob, url: URL.createObjectURL(blob) });
    } catch (prepareError) {
      setErrorMessage(prepareError.message ?? 'Não foi possível abrir a imagem. Tente outra imagem.');
      clearFileInput();
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSave() {
    try {
      setIsBusy(true);
      setErrorMessage('');
      await saveCompanyLogo(getAccessTokenSilently, pendingLogo.blob);
      setCurrentLogo(URL.createObjectURL(pendingLogo.blob));
      setPendingLogo(null);
      clearFileInput();
      setSuccessMessage('Logo salvo. Ele já aparece nos links dos seus orçamentos.');
    } catch (requestError) {
      setErrorMessage(requestError.message);
    } finally {
      setIsBusy(false);
    }
  }

  function handleCancel() {
    setPendingLogo(null);
    setErrorMessage('');
    clearFileInput();
  }

  async function handleRemove() {
    try {
      setIsBusy(true);
      setErrorMessage('');
      setSuccessMessage('');
      await removeCompanyLogo(getAccessTokenSilently);
      setCurrentLogo(null);
      setSuccessMessage('Logo removido.');
    } catch (requestError) {
      setErrorMessage(requestError.message);
    } finally {
      setIsBusy(false);
    }
  }

  const previewUrl = pendingLogo?.url ?? currentLogo;

  return (
    <section className="company-logo" aria-labelledby="company-logo-title">
      <h3 id="company-logo-title">Logo da empresa (opcional)</h3>

      {!hasCompany ? (
        <p>Salve os dados profissionais acima para poder enviar o logo.</p>
      ) : (
        <>
          <p>Aparece no topo do orçamento que o cliente abre pelo link. Use PNG, JPEG ou WebP; a imagem é reduzida automaticamente.</p>

          {isLoading && <p role="status">Carregando logo...</p>}

          {previewUrl && (
            <figure className="company-logo-preview">
              <img src={previewUrl} alt={pendingLogo ? 'Prévia do novo logo' : 'Logo atual da empresa'} />
              {pendingLogo && <figcaption>Prévia: o logo ainda não foi salvo.</figcaption>}
            </figure>
          )}

          {pendingLogo ? (
            <div className="company-logo-actions">
              <button type="button" className="button-primary" onClick={handleSave} disabled={isBusy}>
                {isBusy ? 'Salvando...' : 'Salvar logo'}
              </button>
              <button type="button" onClick={handleCancel} disabled={isBusy}>
                Cancelar
              </button>
            </div>
          ) : (
            <div className="company-logo-actions">
              {/* O campo de arquivo fica dentro do rótulo, que tem aparência de botão e recebe o foco do teclado. */}
              <label className={`file-button${isBusy || isLoading ? ' file-button-disabled' : ''}`}>
                {currentLogo ? 'Trocar logo' : 'Escolher imagem'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_LOGO_TYPES.join(',')}
                  onChange={handleFileChange}
                  disabled={isBusy || isLoading}
                  className="visually-hidden"
                />
              </label>

              {currentLogo && (
                <button type="button" className="button-danger" onClick={handleRemove} disabled={isBusy}>
                  {isBusy ? 'Removendo...' : 'Remover logo'}
                </button>
              )}
            </div>
          )}

          {errorMessage && <p role="alert">{errorMessage}</p>}
          {successMessage && <p role="status">{successMessage}</p>}
        </>
      )}
    </section>
  );
}

export default CompanyLogoField;
