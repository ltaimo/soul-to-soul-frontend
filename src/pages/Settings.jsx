import React, { useContext, useEffect, useState } from 'react';
import { StoreContext } from '../context/StoreContext';
import { LanguageContext } from '../context/LanguageContext';
import { Save, Building2, Coins, HeartPulse, Package, ReceiptText, SlidersHorizontal, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const csvToOptions = (value) => String(value || '')
  .split(',')
  .map((label) => label.trim())
  .filter(Boolean)
  .map((label) => ({ label, active: true }));

const toOptions = (value, fallback = []) => {
  const source = Array.isArray(value) && value.length ? value : fallback;

  if (!Array.isArray(source)) {
    return csvToOptions(source);
  }

  return source
    .map((item) => {
      if (typeof item === 'string') return { label: item.trim(), active: true };
      return {
        label: String(item?.label || '').trim(),
        active: item?.active !== false,
      };
    })
    .filter((item) => item.label);
};

const cleanOptions = (value) => toOptions(value).filter((item) => item.label);

export const Settings = () => {
  const { settings, updateSettings } = useContext(StoreContext);
  const { translate } = useContext(LanguageContext);
  const [formData, setFormData] = useState({
    companyName: 'Soul2Soul',
    companyLogo: '',
    defaultCurrency: 'MZN',
    currencySymbol: 'MT',
    decimalFormatting: 2,
    hrPaymentTypesOptions: [],
    paymentMethodsOptions: [],
    warehouseTypesOptions: [],
    productCategoriesOptions: [],
    productTypesOptions: [],
    productUnitsOptions: [],
    attendanceStatusesOptions: [],
    payFrequenciesOptions: [],
  });
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || 'Soul2Soul',
        companyLogo: settings.companyLogo || '',
        defaultCurrency: settings.defaultCurrency || 'MZN',
        currencySymbol: settings.currencySymbol || 'MT',
        decimalFormatting: settings.decimalFormatting ?? 2,
        hrPaymentTypesOptions: toOptions(settings.hrPaymentTypesOptions, settings.hrPaymentTypesList || settings.hrPaymentTypes),
        paymentMethodsOptions: toOptions(settings.paymentMethodsOptions, settings.paymentMethodsList || settings.paymentMethods),
        warehouseTypesOptions: toOptions(settings.warehouseTypesOptions, settings.warehouseTypesList || settings.warehouseTypes),
        productCategoriesOptions: toOptions(settings.productCategoriesOptions, settings.productCategoriesList || settings.productCategories),
        productTypesOptions: toOptions(settings.productTypesOptions, settings.productTypesList || settings.productTypes),
        productUnitsOptions: toOptions(settings.productUnitsOptions, settings.productUnitsList || settings.productUnits),
        attendanceStatusesOptions: toOptions(settings.attendanceStatusesOptions, settings.attendanceStatusesList || settings.attendanceStatuses),
        payFrequenciesOptions: toOptions(settings.payFrequenciesOptions, settings.payFrequenciesList || settings.payFrequencies),
      });
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    const result = await updateSettings({
      companyName: formData.companyName,
      companyLogo: formData.companyLogo,
      defaultCurrency: formData.defaultCurrency,
      currencySymbol: formData.currencySymbol,
      decimalFormatting: Number(formData.decimalFormatting),
      hrPaymentTypesOptions: cleanOptions(formData.hrPaymentTypesOptions),
      paymentMethodsOptions: cleanOptions(formData.paymentMethodsOptions),
      warehouseTypesOptions: cleanOptions(formData.warehouseTypesOptions),
      productCategoriesOptions: cleanOptions(formData.productCategoriesOptions),
      productTypesOptions: cleanOptions(formData.productTypesOptions),
      productUnitsOptions: cleanOptions(formData.productUnitsOptions),
      attendanceStatusesOptions: cleanOptions(formData.attendanceStatusesOptions),
      payFrequenciesOptions: cleanOptions(formData.payFrequenciesOptions),
    });
    setStatusMsg(result.success ? translate('settingsSaved') : `Error: ${result.error}`);
  };

  const setField = (key, value) => setFormData((current) => ({ ...current, [key]: value }));
  const setOptionList = (key, updater) => setFormData((current) => ({
    ...current,
    [key]: updater(current[key] || []),
  }));

  return (
    <form onSubmit={handleSubmit}>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>{translate('settings')}</h1>
          <p className="page-subtitle">{translate('settingsSubtitle')}</p>
        </div>
        <button className="btn btn-primary" type="submit">
          <Save size={18} />
          {translate('saveChanges')}
        </button>
      </div>

      {statusMsg && (
        <div className={`inline-alert ${statusMsg.includes('Error') ? 'inline-alert-danger' : 'inline-alert-success'}`}>
          {statusMsg}
        </div>
      )}

      <div className="settings-grid">
        <SettingsCard icon={<Building2 size={20} />} title={translate('companyProfile')} hint={translate('companyProfileHint')}>
          <TextInput label={translate('companyName')} value={formData.companyName} onChange={(value) => setField('companyName', value)} />
          <TextInput label={translate('logoUrl')} value={formData.companyLogo} onChange={(value) => setField('companyLogo', value)} placeholder="https://..." />
        </SettingsCard>

        <SettingsCard icon={<Coins size={20} />} title={translate('financialPreferences')} hint={translate('financialPreferencesHint')}>
          <div className="form-grid-2">
            <TextInput label={translate('currencyCode')} value={formData.defaultCurrency} onChange={(value) => setField('defaultCurrency', value)} placeholder="MZN" />
            <TextInput label={translate('currencySymbol')} value={formData.currencySymbol} onChange={(value) => setField('currencySymbol', value)} placeholder="MT" />
          </div>
          <div className="form-group">
            <label className="form-label">{translate('decimalPlaces')}</label>
            <select className="form-input" value={formData.decimalFormatting} onChange={(event) => setField('decimalFormatting', Number(event.target.value))}>
              <option value={0}>0 (MT 1500)</option>
              <option value={1}>1 (MT 1500.5)</option>
              <option value={2}>2 (MT 1500.50)</option>
            </select>
          </div>
        </SettingsCard>

        <SettingsCard icon={<ReceiptText size={20} />} title={translate('payments')} hint={translate('paymentsHint')}>
          <OptionManager label={translate('salesPaymentMethods')} value={formData.paymentMethodsOptions} onChange={(updater) => setOptionList('paymentMethodsOptions', updater)} translate={translate} />
          <OptionManager label={translate('hrPaymentTypes')} value={formData.hrPaymentTypesOptions} onChange={(updater) => setOptionList('hrPaymentTypesOptions', updater)} translate={translate} />
        </SettingsCard>

        <SettingsCard icon={<Package size={20} />} title={translate('inventoryProducts')} hint={translate('inventoryProductsHint')}>
          <OptionManager label={translate('warehouseTypes')} value={formData.warehouseTypesOptions} onChange={(updater) => setOptionList('warehouseTypesOptions', updater)} translate={translate} />
          <OptionManager label={translate('productCategories')} value={formData.productCategoriesOptions} onChange={(updater) => setOptionList('productCategoriesOptions', updater)} translate={translate} />
          <OptionManager label={translate('productTypes')} value={formData.productTypesOptions} onChange={(updater) => setOptionList('productTypesOptions', updater)} translate={translate} />
          <OptionManager label={translate('productUnits')} value={formData.productUnitsOptions} onChange={(updater) => setOptionList('productUnitsOptions', updater)} translate={translate} />
        </SettingsCard>

        <SettingsCard icon={<HeartPulse size={20} />} title={translate('hrDefaults')} hint={translate('hrDefaultsHint')}>
          <OptionManager label={translate('attendanceStatuses')} value={formData.attendanceStatusesOptions} onChange={(updater) => setOptionList('attendanceStatusesOptions', updater)} translate={translate} />
          <OptionManager label={translate('payFrequencies')} value={formData.payFrequenciesOptions} onChange={(updater) => setOptionList('payFrequenciesOptions', updater)} translate={translate} />
        </SettingsCard>

        <SettingsCard icon={<SlidersHorizontal size={20} />} title={translate('editListsHelpTitle')} hint={translate('editListsHelpHint')}>
          <p className="settings-help">
            {translate('editListsHelp1')}
          </p>
          <p className="settings-help">
            {translate('editListsHelp2')}
          </p>
        </SettingsCard>
      </div>
    </form>
  );
};

const SettingsCard = ({ icon, title, hint, children }) => (
  <section className="card settings-card">
    <h2>
      {icon}
      {title}
    </h2>
    <p>{hint}</p>
    {children}
  </section>
);

const TextInput = ({ label, value, onChange, ...props }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} {...props} />
  </div>
);

const OptionManager = ({ label, value, onChange, translate }) => {
  const activeCount = value.filter((item) => item.active !== false && item.label.trim()).length;
  const totalCount = value.filter((item) => item.label.trim()).length;

  const updateItem = (index, patch) => {
    onChange((items) => items.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  };

  const removeItem = (index) => {
    onChange((items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="form-group settings-option-group">
      <div className="settings-option-heading">
        <label className="form-label">{label}</label>
        <span>{translate('activeOptions', { active: activeCount, total: totalCount })}</span>
      </div>
      <div className="settings-option-list">
        {value.map((item, index) => (
          <div className={`settings-option-row ${item.active === false ? 'is-inactive' : ''}`} key={`${label}-${index}`}>
            <input
              className="form-input"
              value={item.label}
              placeholder={translate('optionName')}
              onChange={(event) => updateItem(index, { label: event.target.value })}
            />
            <button
              className={`settings-toggle ${item.active === false ? 'is-off' : 'is-on'}`}
              type="button"
              onClick={() => updateItem(index, { active: item.active === false })}
              title={item.active === false ? translate('activate') : translate('deactivate')}
            >
              {item.active === false ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
              {item.active === false ? translate('inactive') : translate('active')}
            </button>
            <button className="btn btn-ghost compact-btn settings-remove" type="button" onClick={() => removeItem(index)} title={translate('remove')}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-secondary settings-add-row" type="button" onClick={() => onChange((items) => [...items, { label: '', active: true }])}>
        <Plus size={16} />
        {translate('addOption')}
      </button>
    </div>
  );
};
