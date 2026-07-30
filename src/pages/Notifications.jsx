import React, { useContext } from 'react';
import { AlertTriangle, Bell, CheckCircle, Clock, ExternalLink, Info, WalletCards } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';

const iconMap = {
  danger: <AlertTriangle size={18} />,
  warning: <Clock size={18} />,
  success: <CheckCircle size={18} />,
  info: <Info size={18} />,
};

const labelMap = {
  danger: 'Critico',
  warning: 'Atencao',
  success: 'Informacao',
  info: 'Acompanhar',
};

export const Notifications = ({ setActivePage }) => {
  const { notifications } = useContext(StoreContext);
  const openNotification = (notification) => {
    if (setActivePage && notification.page) {
      setActivePage(notification.page, notification.filter || null);
    }
  };

  const criticalCount = notifications.filter((item) => item.severity === 'danger').length;
  const approvalCount = notifications.filter((item) => item.type === 'approval').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notificacoes</h1>
          <p className="page-subtitle">Tudo que precisa de aprovacao, revisao ou acompanhamento aparece aqui.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total ativo</div>
          <div className="stat-value">{notifications.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Criticas</div>
          <div className="stat-value">{criticalCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Aprovacoes</div>
          <div className="stat-value">{approvalCount}</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
          <Bell size={20} /> Caixa de notificacoes
        </h3>
        <div className="notification-list">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              className={`notification-card ${notification.severity}`}
              onClick={() => openNotification(notification)}
            >
              <span className="notification-icon">{iconMap[notification.severity] || <WalletCards size={18} />}</span>
              <span>
                <strong>{notification.title}</strong>
                <small>{labelMap[notification.severity] || 'Aviso'} · {notification.page}</small>
                <p>{notification.message}</p>
              </span>
              <ExternalLink size={16} />
            </button>
          ))}
          {notifications.length === 0 && (
            <div className="empty-state">
              <CheckCircle size={32} />
              <h3>Sem notificacoes pendentes</h3>
              <p>Nao ha aprovacoes, rupturas, transferencias ou deadlines a pedir atencao agora.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
