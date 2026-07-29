import React, { useContext, useMemo } from 'react';
import { HelpCircle, ShieldAlert, KeyRound, Package, ReceiptText, Users, Settings, FileQuestion } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { getRoleProfile } from '../config/roles';

const helpTopics = [
  {
    id: 'sales',
    pages: ['Sales / POS'],
    icon: <ReceiptText size={20} />,
    title: { en: 'Sales and payments', pt: 'Vendas e pagamentos' },
    body: {
      en: 'Use Sales / POS to select the warehouse, add the customer code when loyalty points apply, confirm stock, payment method and amount paid before completing the sale.',
      pt: 'Use Vendas / Caixa para escolher o armazem, adicionar o codigo do cliente quando houver pontos de fidelizacao, confirmar stock, metodo de pagamento e valor pago antes de finalizar.',
    },
  },
  {
    id: 'stock',
    pages: ['Inventory', 'Products', 'Purchasing'],
    icon: <Package size={20} />,
    title: { en: 'Stock and warehouses', pt: 'Stock e armazens' },
    body: {
      en: 'Inventory controls warehouse quantities. Use receive, adjust, transfer and import/export actions instead of editing stock silently.',
      pt: 'O Inventario controla quantidades por armazem. Use receber, ajustar, transferir e importar/exportar em vez de alterar stock sem registo.',
    },
  },
  {
    id: 'hr',
    pages: ['Human Resources'],
    icon: <Users size={20} />,
    title: { en: 'Human resources', pt: 'Recursos humanos' },
    body: {
      en: 'HR keeps worker data, payroll sheets, attendance and goal-based tracking. Roles and departments are configured in Settings.',
      pt: 'Recursos Humanos guarda trabalhadores, folha salarial, assiduidade e metas. Funcoes e departamentos sao configurados nas Definicoes.',
    },
  },
  {
    id: 'settings',
    pages: ['Settings'],
    icon: <Settings size={20} />,
    title: { en: 'Settings and reusable lists', pt: 'Definicoes e listas reutilizaveis' },
    body: {
      en: 'Settings control reusable options such as payment methods, product units, HR departments and critical administrator tools.',
      pt: 'As Definicoes controlam opcoes reutilizaveis como metodos de pagamento, unidades, departamentos e ferramentas criticas de administrador.',
    },
  },
  {
    id: 'critical',
    pages: ['Settings', 'Audit Logs', 'User Administration'],
    adminOnly: true,
    icon: <ShieldAlert size={20} />,
    title: { en: 'Critical resets', pt: 'Resets criticos' },
    body: {
      en: 'Critical resets require an administrator security code, a reason and the confirmation text RESET SOUL2SOUL. Every action is audited.',
      pt: 'Resets criticos exigem codigo de seguranca do administrador, motivo e o texto RESET SOUL2SOUL. Toda acao fica auditada.',
    },
  },
];

export const HelpCenter = () => {
  const { user } = useContext(AuthContext);
  const { language } = useContext(LanguageContext);
  const roleProfile = getRoleProfile(user?.role);

  const topics = useMemo(() => helpTopics.filter((topic) => {
    if (topic.adminOnly && user?.role !== 'admin') return false;
    return topic.pages.some((page) => roleProfile.pages.includes(page));
  }), [roleProfile.pages, user?.role]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>
            {language === 'pt' ? 'Centro de Ajuda' : 'Help Center'}
          </h1>
          <p className="page-subtitle">
            {language === 'pt'
              ? `Ajuda ajustada ao teu perfil: ${roleProfile.label}.`
              : `Guidance adjusted to your profile: ${roleProfile.label}.`}
          </p>
        </div>
      </div>

      <div className="card help-hero">
        <HelpCircle size={26} />
        <div>
          <h2>{language === 'pt' ? 'Quando algo nao funciona' : 'When something does not work'}</h2>
          <p>
            {language === 'pt'
              ? 'Verifica primeiro se tens permissao para o modulo, se todos os campos obrigatorios foram preenchidos e se ha stock suficiente. Mensagens de erro aparecem em alertas pequenos junto da acao.'
              : 'First check whether your role can access the module, whether required fields are filled, and whether enough stock exists. Error messages appear as small alerts near the action.'}
          </p>
        </div>
      </div>

      <div className="settings-grid help-grid">
        {topics.map((topic) => (
          <section className="card settings-card" key={topic.id}>
            <h2>
              {topic.icon}
              {topic.title[language] || topic.title.en}
            </h2>
            <p>{topic.body[language] || topic.body.en}</p>
          </section>
        ))}
        <section className="card settings-card">
          <h2>
            <KeyRound size={20} />
            {language === 'pt' ? 'Codigos de seguranca' : 'Security codes'}
          </h2>
          <p>
            {language === 'pt'
              ? 'Codigos sao gerados apenas por administradores, aparecem uma unica vez, expiram em 10 minutos e so servem para a finalidade emitida.'
              : 'Codes are generated only by administrators, shown once, expire in 10 minutes and work only for their issued purpose.'}
          </p>
        </section>
        <section className="card settings-card">
          <h2>
            <FileQuestion size={20} />
            {language === 'pt' ? 'Sem permissao?' : 'No permission?'}
          </h2>
          <p>
            {language === 'pt'
              ? 'Se um botao nao abre ou uma acao e bloqueada, o teu perfil pode nao ter esse privilegio. Contacta um administrador para ajustar o role ou criar um utilizador correto.'
              : 'If a button does not open or an action is blocked, your role may not include that privilege. Contact an administrator to adjust the role or create the right user.'}
          </p>
        </section>
      </div>
    </div>
  );
};
