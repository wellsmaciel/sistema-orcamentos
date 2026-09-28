import { useEffect, useState } from 'react';

import { requestCompany, saveCompany } from '../services/company.js';

const initialFormData = {
  name: '',
  email: '',
  phone: '',
  taxId: '',
  street: '',
  number: '',
  complement: '',
  postalCode: '',
  district: '',
  city: '',
  state: '',
};

const addressFields = ['street', 'number', 'complement', 'postalCode', 'district', 'city', 'state'];

function companyToFormData(company) {
  return {
    ...initialFormData,
    name: company.name,
    email: company.email,
    phone: company.phone,
    taxId: company.taxId ?? '',
    street: company.address?.street ?? '',
    number: company.address?.number ?? '',
    complement: company.address?.complement ?? '',
    postalCode: company.address?.postalCode ?? '',
    district: company.address?.district ?? '',
    city: company.address?.city ?? '',
    state: company.address?.state ?? '',
  };
}

function CompanyForm({ getAccessTokenSilently }) {
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const hasAddress = addressFields.some((field) => formData[field].trim().length > 0);

  useEffect(() => {
    let ignoreResult = false;

    async function loadCompany() {
      try {
        setLoadError('');

        const company = await requestCompany(getAccessTokenSilently);

        if (!ignoreResult && company) {
          setFormData(companyToFormData(company));
        }
      } catch (requestError) {
        if (!ignoreResult) {
          setLoadError(requestError.message);
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    loadCompany();

    return () => {
      ignoreResult = true;
    };
  }, [getAccessTokenSilently]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));

    setSuccessMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSuccessMessage('');

      const companyInput = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        taxId: formData.taxId,
      };

      if (hasAddress) {
        companyInput.address = {
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          postalCode: formData.postalCode,
          district: formData.district,
          city: formData.city,
          state: formData.state,
        };
      }

      const company = await saveCompany(getAccessTokenSilently, companyInput);

      setFormData(companyToFormData(company));
      setSuccessMessage('Dados profissionais salvos com sucesso.');
    } catch (requestError) {
      setSubmitError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p role="status">Carregando dados profissionais...</p>;
  }

  return (
    <section aria-labelledby="company-profile-title">
      <h2 id="company-profile-title">Perfil profissional</h2>

      <p>Informe seus dados profissionais ou os dados da sua empresa. O endereço e o CPF ou CNPJ são opcionais.</p>

      {loadError && <p role="alert">{loadError}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="company-name">Nome profissional ou da empresa</label>
          <input id="company-name" name="name" type="text" value={formData.name} onChange={handleChange} maxLength={150} required />
        </div>

        <div>
          <label htmlFor="company-email">E-mail comercial</label>
          <input id="company-email" name="email" type="email" value={formData.email} onChange={handleChange} maxLength={320} required />
        </div>

        <div>
          <label htmlFor="company-phone">Telefone comercial</label>
          <input id="company-phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} minLength={8} maxLength={30} required />
        </div>

        <div>
          <label htmlFor="company-tax-id">CPF ou CNPJ</label>
          <input id="company-tax-id" name="taxId" type="text" value={formData.taxId} onChange={handleChange} maxLength={20} />
        </div>

        <fieldset>
          <legend>Endereço profissional (opcional)</legend>

          <p>Se você começar a preencher o endereço, os campos principais serão obrigatórios.</p>

          <div>
            <label htmlFor="company-street">Rua</label>
            <input id="company-street" name="street" type="text" value={formData.street} onChange={handleChange} maxLength={200} required={hasAddress} />
          </div>

          <div>
            <label htmlFor="company-number">Número</label>
            <input id="company-number" name="number" type="text" value={formData.number} onChange={handleChange} maxLength={30} required={hasAddress} />
          </div>

          <div>
            <label htmlFor="company-complement">Complemento</label>
            <input id="company-complement" name="complement" type="text" value={formData.complement} onChange={handleChange} maxLength={150} />
          </div>

          <div>
            <label htmlFor="company-postal-code">CEP</label>
            <input id="company-postal-code" name="postalCode" type="text" value={formData.postalCode} onChange={handleChange} maxLength={20} required={hasAddress} />
          </div>

          <div>
            <label htmlFor="company-district">Bairro</label>
            <input id="company-district" name="district" type="text" value={formData.district} onChange={handleChange} maxLength={100} required={hasAddress} />
          </div>

          <div>
            <label htmlFor="company-city">Cidade</label>
            <input id="company-city" name="city" type="text" value={formData.city} onChange={handleChange} maxLength={100} required={hasAddress} />
          </div>

          <div>
            <label htmlFor="company-state">Estado</label>
            <input id="company-state" name="state" type="text" value={formData.state} onChange={handleChange} maxLength={100} required={hasAddress} />
          </div>
        </fieldset>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar dados profissionais'}
        </button>

        {submitError && <p role="alert">{submitError}</p>}
        {successMessage && <p role="status">{successMessage}</p>}
      </form>
    </section>
  );
}

export default CompanyForm;
