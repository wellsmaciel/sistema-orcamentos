import { useEffect, useState } from 'react';

import { requestCompany, saveCompany } from '../services/company.js';
import { PHONE_ERROR_MESSAGE, normalizeBrazilianPhone } from '../utils/phone.js';
import { TAX_ID_ERROR_MESSAGE, normalizeBrazilianTaxId, standardizeBrazilianTaxId } from '../utils/tax-id.js';
import { focusFirstFieldWithError } from '../utils/form-errors.js';
import CompanyLogoField from './CompanyLogoField.jsx';
import FormField from './FormField.jsx';
import PhoneField from './PhoneField.jsx';
import TaxIdField from './TaxIdField.jsx';

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
    taxId: standardizeBrazilianTaxId(company.taxId) ?? company.taxId ?? '',
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
  const [fieldErrors, setFieldErrors] = useState({});
  // Erros encontrados pela tela são anunciados no próprio campo; os do servidor, pela mensagem geral.
  const [announceFieldErrors, setAnnounceFieldErrors] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [savedCompany, setSavedCompany] = useState(null);

  const hasAddress = addressFields.some((field) => formData[field].trim().length > 0);

  useEffect(() => {
    let ignoreResult = false;

    async function loadCompany() {
      try {
        setLoadError('');

        const company = await requestCompany(getAccessTokenSilently);

        if (!ignoreResult && company) {
          setFormData(companyToFormData(company));
          setSavedCompany(company);
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

    setFieldErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      return { ...currentErrors, [name]: '' };
    });
    setSuccessMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const nextFieldErrors = {};

    if (!normalizeBrazilianPhone(formData.phone)) {
      nextFieldErrors.phone = PHONE_ERROR_MESSAGE;
    }

    if (formData.taxId.trim() && !normalizeBrazilianTaxId(formData.taxId)) {
      nextFieldErrors.taxId = TAX_ID_ERROR_MESSAGE;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setAnnounceFieldErrors(true);
      setSubmitError('');
      setSuccessMessage('');
      focusFirstFieldWithError(form, nextFieldErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setFieldErrors({});
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
      setSavedCompany(company);
      setSuccessMessage('Dados profissionais salvos com sucesso.');
    } catch (requestError) {
      const serverFieldErrors = requestError.fieldErrors ?? {};

      setSubmitError(requestError.message);
      setFieldErrors(serverFieldErrors);
      setAnnounceFieldErrors(false);
      focusFirstFieldWithError(form, serverFieldErrors);
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
        <FormField id="company-name" label="Nome profissional ou da empresa" name="name" type="text" value={formData.name} onChange={handleChange} maxLength={150} required errorMessage={fieldErrors.name} />

        <FormField id="company-email" label="E-mail comercial" name="email" type="email" value={formData.email} onChange={handleChange} maxLength={320} required errorMessage={fieldErrors.email} />

        <PhoneField
          id="company-phone"
          label="Telefone comercial"
          value={formData.phone}
          onChange={handleChange}
          hint="Aparece no orçamento enviado ao cliente."
          errorMessage={fieldErrors.phone}
          announceError={announceFieldErrors}
        />

        <TaxIdField value={formData.taxId} onChange={handleChange} errorMessage={fieldErrors.taxId} announceError={announceFieldErrors} />

        <fieldset>
          <legend>Endereço profissional (opcional)</legend>

          <p>Se você começar a preencher o endereço, os campos principais serão obrigatórios.</p>

          <FormField id="company-street" label="Logradouro (rua, avenida...)" name="street" type="text" value={formData.street} onChange={handleChange} maxLength={200} required={hasAddress} errorMessage={fieldErrors.street} />

          <FormField id="company-number" label="Número" name="number" type="text" value={formData.number} onChange={handleChange} maxLength={30} required={hasAddress} errorMessage={fieldErrors.number} />

          <FormField id="company-complement" label="Complemento" name="complement" type="text" value={formData.complement} onChange={handleChange} maxLength={150} errorMessage={fieldErrors.complement} />

          <FormField id="company-postal-code" label="CEP" name="postalCode" type="text" value={formData.postalCode} onChange={handleChange} maxLength={20} required={hasAddress} errorMessage={fieldErrors.postalCode} />

          <FormField id="company-district" label="Bairro" name="district" type="text" value={formData.district} onChange={handleChange} maxLength={100} required={hasAddress} errorMessage={fieldErrors.district} />

          <FormField id="company-city" label="Cidade" name="city" type="text" value={formData.city} onChange={handleChange} maxLength={100} required={hasAddress} errorMessage={fieldErrors.city} />

          <FormField id="company-state" label="Estado" name="state" type="text" value={formData.state} onChange={handleChange} maxLength={100} required={hasAddress} errorMessage={fieldErrors.state} />
        </fieldset>

        <button type="submit" className="button-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar dados profissionais'}
        </button>

        {submitError && <p role="alert">{submitError}</p>}
        {successMessage && <p role="status">{successMessage}</p>}
      </form>

      <CompanyLogoField
        key={savedCompany?.id ?? 'sem-perfil'}
        getAccessTokenSilently={getAccessTokenSilently}
        hasCompany={Boolean(savedCompany)}
        hasLogo={Boolean(savedCompany?.hasLogo)}
      />
    </section>
  );
}

export default CompanyForm;
