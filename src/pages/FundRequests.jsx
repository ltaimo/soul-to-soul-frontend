import React, { useContext, useMemo, useState } from 'react';
import { CheckCircle, Mail, MessageCircle, Printer, Send, Sparkles, XCircle } from 'lucide-react';
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Requisicao de Fundos</h1>
          <p className="page-subtitle">Pedidos internos com aprovacao, historico e saida para PDF, email ou WhatsApp.</p>
        </div>
      </div>

      {message && <div className="info-banner" style={{ marginBottom: '1rem' }}>{message}</div>}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total solicitado</div><div className="stat-value">{formatCurrency(totals.total, settings)}</div></div>
        <div className="stat-card"><div className="stat-label">Pendente</div><div className="stat-value">{formatCurrency(totals.Pending || 0, settings)}</div></div>
        <div className="stat-card"><div className="stat-label">Aprovado</div><div className="stat-value">{formatCurrency(totals.Approved || 0, settings)}</div></div>
        <div className="stat-card"><div className="stat-label">Pago</div><div className="stat-value">{formatCurrency(totals.Paid || 0, settings)}</div></div>
      </div>

      <div className="content-grid" style={{ alignItems: 'start' }}>
        <form className="card" onSubmit={submit}>
          <h3 style={{ marginBottom: '1rem' }}>Novo pedido</h3>
          <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
            Criado por: <strong>{user?.fullName || user?.email}</strong>
          </p>
          <div className="form-grid-2">
            <label>Tipo de pedido<select value={form.title} onChange={(event) => updateForm('title', event.target.value)} required>{requestTitles.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Categoria<select value={form.category} onChange={(event) => updateForm('category', event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Valor<input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} required /></label>
            <label>Necessario ate<input type="date" value={form.neededBy} onChange={(event) => updateForm('neededBy', event.target.value)} /></label>
            <label>Prioridade<select value={form.priority} onChange={(event) => updateForm('priority', event.target.value)}>{priorities.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Departamento<select value={form.department} onChange={(event) => updateForm('department', event.target.value)}><option value="">Selecionar</option>{departmentOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Metodo de pagamento<select value={form.paymentMethod} onChange={(event) => updateForm('paymentMethod', event.target.value)}><option value="">Selecionar</option>{paymentMethodOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Beneficiario<input value={form.payeeName} onChange={(event) => updateForm('payeeName', event.target.value)} /></label>
            <label>Telefone<input value={form.payeePhone} onChange={(event) => updateForm('payeePhone', event.target.value)} /></label>
            <label>Banco / conta<input value={form.payeeBank} onChange={(event) => updateForm('payeeBank', event.target.value)} /></label>
          </div>
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
          <label style={{ display: 'block', marginTop: '1rem' }}>Detalhes / justificacao<textarea rows="4" value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Explique o motivo, fornecedor, destino ou contexto do pedido." /></label>
          <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: '1rem' }}>
            <Send size={16} /> {saving ? 'A enviar...' : 'Enviar requisicao'}
          </button>
        </form>

        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Historico e aprovacao</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {fundRequests.map((request) => (
              <div key={request.id} className="soft-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
                  <div>
                    <strong>{request.requestNumber} - {request.title}</strong>
                    <p className="page-subtitle">{request.requesterName} - {request.category} - {request.neededBy ? new Date(request.neededBy).toLocaleDateString() : 'Sem data limite'}</p>
                  </div>
                  <span className={`status-pill ${statusColors[request.status] || 'muted'}`}>{request.status}</span>
                </div>
                <p style={{ margin: '0.75rem 0', color: 'var(--color-charcoal-light)' }}>{request.description || 'Sem descricao adicional.'}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <strong>{formatCurrency(request.amount, settings)}</strong>
                  <span>Prioridade: {request.priority}</span>
                  {request.payeeName && <span>Beneficiario: {request.payeeName}</span>}
                  {request.reviewedByName && <span>Revisto por: {request.reviewedByName}</span>}
                </div>
                {canApprove && request.status === 'Pending' && (
                  <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.8rem' }}>
                    <input
                      placeholder="Nota de revisao opcional"
                      value={reviewNotes[request.id] || ''}
                      onChange={(event) => setReviewNotes((current) => ({ ...current, [request.id]: event.target.value }))}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <button className="btn btn-primary" type="button" onClick={() => changeStatus(request, 'Approved')}><CheckCircle size={16} /> Aprovar</button>
                      <button className="btn" type="button" onClick={() => changeStatus(request, 'Rejected')}><XCircle size={16} /> Rejeitar</button>
                    </div>
                  </div>
                )}
                {canApprove && request.status === 'Approved' && (
                  <button className="btn btn-primary" type="button" onClick={() => changeStatus(request, 'Paid')} style={{ marginTop: '0.8rem' }}>
                    Marcar como pago
                  </button>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.8rem' }}>
                  <button className="btn btn-ghost" type="button" onClick={() => printRequest(request)}><Printer size={16} /> PDF/Print</button>
                  <a className="btn btn-ghost" href={`mailto:?subject=${encodeURIComponent(request.requestNumber)}&body=${encodeURIComponent(requestText(request))}`}><Mail size={16} /> Email</a>
                  <a className="btn btn-ghost" href={`https://wa.me/?text=${encodeURIComponent(requestText(request))}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>
                  {request.status === 'Pending' && (
                    <button className="btn btn-ghost" type="button" onClick={() => cancel(request)}>Cancelar</button>
                  )}
                </div>
              </div>
            ))}
            {fundRequests.length === 0 && <p className="page-subtitle">Ainda nao existem requisicoes de fundos.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
