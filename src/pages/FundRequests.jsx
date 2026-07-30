import React, { useContext, useMemo, useState } from 'react';
import { Banknote, CalendarDays, CheckCircle, ClipboardCheck, Filter, Mail, MessageCircle, Printer, Send, Sparkles, UserRound, WalletCards, XCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { StoreContext } from '../context/StoreContext';
import { formatCurrency } from '../utils/formatters';

const categories = ['Stock Purchase', 'Production', 'Transport', 'Marketing', 'Operations', 'HR', 'Rent', 'Utilities', 'Other'];
const priorities = ['Low', 'Normal', 'High', 'Urgent'];
const requestTitles = [
  'Compra de stock',
  'Compra de materia-prima',
  'Transporte / entrega',
  'Marketing e promocao',
  'Pagamento operacional',
  'Manutencao / reparacao',
  'Renda / servicos',
  'Adiantamento ou apoio interno',
  'Outro pedido',
];

const emptyForm = {
  title: 'Pagamento operacional',
  category: 'Operations',
  amount: '',
  neededBy: '',
  priority: 'Normal',
  department: '',
  paymentMethod: '',
  payeeName: '',
  payeePhone: '',
  payeeBank: '',
  description: '',
};

const statusColors = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Paid: 'success',
  Cancelled: 'muted',
};

export const FundRequests = () => {
  const { user } = useContext(AuthContext);
  const {
    fundRequests,
    settings,
    createFundRequest,
    updateFundRequestStatus,
    cancelFundRequest,
  } = useContext(StoreContext);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [reviewNotes, setReviewNotes] = useState({});
  const [activeStatus, setActiveStatus] = useState('All');

  const canApprove = ['admin', 'manager'].includes(user?.role);
  const activeOptions = (options, fallback = []) => (
    Array.isArray(options) && options.length
      ? options.filter((item) => item.active !== false).map((item) => item.label || item)
      : fallback
  );
  const departmentOptions = activeOptions(settings.hrDepartmentsOptions, settings.hrDepartmentsList || []);
  const paymentMethodOptions = activeOptions(settings.paymentMethodsOptions, settings.paymentMethodsList || []);

  const totals = useMemo(() => fundRequests.reduce((acc, request) => {
    acc.total += request.amount || 0;
    acc[request.status] = (acc[request.status] || 0) + (request.amount || 0);
    return acc;
  }, { total: 0 }), [fundRequests]);
  const statusTabs = ['All', 'Pending', 'Approved', 'Paid', 'Rejected', 'Cancelled'];
  const filteredRequests = activeStatus === 'All'
    ? fundRequests
    : fundRequests.filter((request) => request.status === activeStatus);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const result = await createFundRequest(form);
    if (result.success) {
      setForm(emptyForm);
      setMessage('Requisicao criada com sucesso.');
    } else {
      setMessage(result.error || 'Nao foi possivel criar a requisicao.');
    }
    setSaving(false);
  };

  const changeStatus = async (request, status) => {
    const result = await updateFundRequestStatus(request.id, {
      status,
      reviewNotes: reviewNotes[request.id] || '',
    });
    setMessage(result.success ? `Requisicao ${status.toLowerCase()} com sucesso.` : result.error);
  };

  const cancel = async (request) => {
    const result = await cancelFundRequest(request.id);
    setMessage(result.success ? 'Requisicao cancelada.' : result.error);
  };

  const requestText = (request) => [
    `Requisicao de fundos ${request.requestNumber}`,
    `Solicitante: ${request.requesterName}`,
    `Categoria: ${request.category}`,
    `Valor: ${formatCurrency(request.amount, settings)}`,
    `Estado: ${request.status}`,
    `Pedido: ${request.title}`,
    request.description ? `Descricao: ${request.description}` : '',
  ].filter(Boolean).join('\n');

  const printRequest = (request) => {
    const companyLines = [
      settings.companyPhone || settings.companyWhatsApp,
      settings.companyEmail,
      settings.companyWebsite,
      settings.companyAddress,
    ].filter(Boolean);
    const html = `
      <html>
        <head>
          <title>${request.requestNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Georgia, 'Times New Roman', serif; padding: 32px; color: #223026; background: #f7f1e4; }
            .card { border: 2px solid #d8c7a1; border-radius: 24px; padding: 28px; background: #fffaf0; position: relative; overflow: hidden; }
            .card:before, .card:after { content: ''; position: absolute; border-radius: 999px; background: rgba(107, 142, 126, 0.12); }
            .card:before { width: 220px; height: 220px; right: -80px; top: -80px; }
            .card:after { width: 180px; height: 180px; left: -70px; bottom: -80px; }
            .brand { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d8c7a1; padding-bottom: 18px; }
            .brand img { width: 116px; height: auto; object-fit: contain; }
            .brand h1 { color: #33451f; margin: 0; font-size: 28px; letter-spacing: 0.04em; }
            .brand p { margin: 4px 0 0; color: #6b705c; font-family: Arial, sans-serif; }
            .stamp { border: 1px solid #6b8e7e; border-radius: 999px; padding: 10px 16px; color: #33451f; font-weight: 700; font-family: Arial, sans-serif; }
            .muted { color: #6b705c; }
            .content { position: relative; z-index: 1; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            td { padding: 10px; border-bottom: 1px solid #eee2c7; vertical-align: top; }
            td:first-child { font-weight: 700; width: 34%; }
            .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 48px; }
            .line { border-top: 1px solid #6b705c; padding-top: 8px; text-align: center; }
            .footer { margin-top: 26px; text-align: center; color: #6b705c; font-size: 12px; font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">
              <div style="display:flex;align-items:center;gap:18px;">
                <img src="/logo.png" alt="Soul2Soul" />
                <div>
                  <h1>${settings.companyName || 'Soul2Soul'}</h1>
                  <p>Natureza. Conexao. Equilibrio.</p>
                  <p>${companyLines.join(' - ')}</p>
                </div>
              </div>
              <div class="stamp">${request.status}</div>
            </div>
            <div class="content">
              <h2>Requisicao de Fundos</h2>
              <p class="muted">${request.requestNumber} - Emitido em ${new Date().toLocaleDateString()}</p>
              <table>
                <tr><td>Solicitante</td><td>${request.requesterName}</td></tr>
                <tr><td>Departamento</td><td>${request.department || '-'}</td></tr>
                <tr><td>Categoria</td><td>${request.category}</td></tr>
                <tr><td>Pedido</td><td>${request.title}</td></tr>
                <tr><td>Valor</td><td>${formatCurrency(request.amount, settings)}</td></tr>
                <tr><td>Necessario ate</td><td>${request.neededBy ? new Date(request.neededBy).toLocaleDateString() : '-'}</td></tr>
                <tr><td>Prioridade</td><td>${request.priority}</td></tr>
                <tr><td>Beneficiario</td><td>${request.payeeName || '-'} ${request.payeePhone ? `(${request.payeePhone})` : ''}</td></tr>
                <tr><td>Pagamento</td><td>${request.paymentMethod || '-'} ${request.payeeBank ? `- ${request.payeeBank}` : ''}</td></tr>
                <tr><td>Descricao</td><td>${request.description || '-'}</td></tr>
                <tr><td>Revisao</td><td>${request.reviewedByName || '-'} ${request.reviewNotes ? `- ${request.reviewNotes}` : ''}</td></tr>
              </table>
              <div class="sign">
                <div class="line">Solicitante</div>
                <div class="line">Aprovacao</div>
              </div>
              <div class="footer">Documento gerado pelo sistema Soul2Soul ERP.</div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="fund-page">
      <section className="fund-hero">
        <div>
          <span className="eyebrow">Finance workflow</span>
          <h1>Requisicao de Fundos</h1>
          <p>Um fluxo simples para pedir, aprovar, pagar e manter historico sem perder o rasto.</p>
        </div>
        <div className="fund-hero-metrics">
          <div><span>Total</span><strong>{formatCurrency(totals.total, settings)}</strong></div>
          <div><span>Pendente</span><strong>{formatCurrency(totals.Pending || 0, settings)}</strong></div>
          <div><span>Aprovado</span><strong>{formatCurrency(totals.Approved || 0, settings)}</strong></div>
        </div>
      </section>

      {message && <div className="info-banner fund-message">{message}</div>}

      <div className="fund-layout">
        <form className="fund-form-card" onSubmit={submit}>
          <div className="fund-card-heading">
            <span className="fund-card-icon"><WalletCards size={20} /></span>
            <div>
              <h3>Novo pedido</h3>
              <p>Criado por <strong>{user?.fullName || user?.email}</strong></p>
            </div>
          </div>

          <div className="fund-section">
            <span className="fund-section-label">1. O que precisa?</span>
            <div className="fund-choice-grid">
              {requestTitles.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`fund-choice-card ${form.title === item ? 'is-active' : ''}`}
                  onClick={() => updateForm('title', item)}
                >
                  <ClipboardCheck size={17} />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="fund-section">
            <span className="fund-section-label">2. Dados principais</span>
            <div className="fund-fields">
              <label>Categoria<select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Valor<input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} required placeholder="0.00" /></label>
              <label>Necessario ate<input type="date" value={form.neededBy} onChange={(event) => updateForm('neededBy', event.target.value)} /></label>
              <label>Departamento<select value={form.department} onChange={(event) => updateForm('department', event.target.value)}><option value="">Selecionar</option>{departmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
          </div>

          <div className="fund-section">
            <span className="fund-section-label">3. Prioridade e pagamento</span>
            <div className="priority-pills">
              {priorities.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  className={`choice-pill ${form.priority === priority ? 'is-active' : ''}`}
                  onClick={() => updateForm('priority', priority)}
                >
                  <Sparkles size={14} /> {priority}
                </button>
              ))}
            </div>
            <div className="fund-fields">
              <label>Metodo de pagamento<select value={form.paymentMethod} onChange={(event) => updateForm('paymentMethod', event.target.value)}><option value="">Selecionar</option>{paymentMethodOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Beneficiario<input value={form.payeeName} onChange={(event) => updateForm('payeeName', event.target.value)} placeholder="Nome do fornecedor ou pessoa" /></label>
              <label>Telefone<input value={form.payeePhone} onChange={(event) => updateForm('payeePhone', event.target.value)} placeholder="+258..." /></label>
              <label>Banco / conta<input value={form.payeeBank} onChange={(event) => updateForm('payeeBank', event.target.value)} placeholder="Opcional" /></label>
            </div>
          </div>

          <div className="fund-section">
            <span className="fund-section-label">4. Justificacao</span>
            <label className="fund-textarea">Detalhes<textarea rows="4" value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Explique o motivo, fornecedor, destino ou contexto do pedido." /></label>
          </div>

          <button className="btn btn-primary fund-submit" type="submit" disabled={saving}>
            <Send size={16} /> {saving ? 'A enviar...' : 'Enviar requisicao'}
          </button>
        </form>

        <section className="fund-review-panel">
          <div className="fund-review-header">
            <div>
              <span className="eyebrow">Review board</span>
              <h3>Revisao e aprovacao</h3>
              <p>{filteredRequests.length} pedidos nesta vista</p>
            </div>
            <Filter size={20} />
          </div>

          <div className="fund-status-tabs">
            {statusTabs.map((status) => (
              <button
                key={status}
                type="button"
                className={activeStatus === status ? 'is-active' : ''}
                onClick={() => setActiveStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="fund-review-list">
            {filteredRequests.map((request) => (
              <article key={request.id} className={`fund-review-card ${request.status.toLowerCase()}`}>
                <div className="fund-review-topline">
                  <span className={`status-pill ${statusColors[request.status] || 'muted'}`}>{request.status}</span>
                  <span>{request.requestNumber}</span>
                </div>
                <div className="fund-review-title">
                  <div>
                    <h4>{request.title}</h4>
                    <p>{request.description || 'Sem descricao adicional.'}</p>
                  </div>
                  <strong>{formatCurrency(request.amount, settings)}</strong>
                </div>
                <div className="fund-meta-row">
                  <span><UserRound size={14} /> {request.requesterName}</span>
                  <span><CalendarDays size={14} /> {request.neededBy ? new Date(request.neededBy).toLocaleDateString() : 'Sem data'}</span>
                  <span><Banknote size={14} /> {request.paymentMethod || 'Metodo por definir'}</span>
                  <span><Sparkles size={14} /> {request.priority}</span>
                </div>

                {canApprove && request.status === 'Pending' && (
                  <div className="fund-review-actions">
                    <input
                      placeholder="Nota de revisao opcional"
                      value={reviewNotes[request.id] || ''}
                      onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                    />
                    <button className="btn btn-primary" type="button" onClick={() => changeStatus(request, 'Approved')}><CheckCircle size={16} /> Aprovar</button>
                    <button className="btn" type="button" onClick={() => changeStatus(request, 'Rejected')}><XCircle size={16} /> Rejeitar</button>
                  </div>
                )}

                {canApprove && request.status === 'Approved' && (
                  <button className="btn btn-primary fund-pay-button" type="button" onClick={() => changeStatus(request, 'Paid')}>
                    Marcar como pago
                  </button>
                )}

                <div className="fund-secondary-actions">
                  <button className="btn btn-ghost" type="button" onClick={() => printRequest(request)}><Printer size={16} /> PDF/Print</button>
                  <a className="btn btn-ghost" href={`mailto:?subject=${encodeURIComponent(request.requestNumber)}&body=${encodeURIComponent(requestText(request))}`}><Mail size={16} /> Email</a>
                  <a className="btn btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(requestText(request))}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>
                  {request.status === 'Pending' && (
                    <button className="btn btn-ghost" type="button" onClick={() => cancel(request)}>Cancelar</button>
                  )}
                </div>
              </article>
            ))}
            {filteredRequests.length === 0 && (
              <div className="empty-state">
                <CheckCircle size={32} />
                <h3>Nada para mostrar aqui</h3>
                <p>Quando houver pedidos neste estado, eles aparecem nesta lista.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
