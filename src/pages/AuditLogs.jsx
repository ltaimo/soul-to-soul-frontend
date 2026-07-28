import React, { useContext, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { StoreContext } from '../context/StoreContext';
import { downloadCsv } from '../utils/csv';

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
};

const parseMetadata = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const AuditLogs = () => {
  const { auditLogs, fetchAuditLogs } = useContext(StoreContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const entityTypes = useMemo(() => {
    return [...new Set(auditLogs.map((log) => log.entityType).filter(Boolean))].sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const matchesEntity = !entityFilter || log.entityType === entityFilter;
      const matchesQuery = !query || `${log.action} ${log.userName || ''} ${log.userEmail || ''} ${log.path} ${log.ipAddress || ''}`.toLowerCase().includes(query);
      return matchesEntity && matchesQuery;
    });
  }, [auditLogs, searchTerm, entityFilter]);

  const refresh = async () => {
    setStatusMsg('');
    setErrorMsg('');
    const result = await fetchAuditLogs({ take: 300, entityType: entityFilter });
    if (!result.success) {
      setErrorMsg(result.error || 'Could not refresh audit logs.');
      return;
    }
    setStatusMsg('Audit logs refreshed.');
  };

  const downloadAuditLogs = () => {
    const rows = filteredLogs.map((log) => {
      const metadata = parseMetadata(log.metadata);
      return {
        Date: formatDateTime(log.createdAt),
        User: log.userName || log.userEmail || 'System',
        Email: log.userEmail || '',
        Role: log.userRole || '',
        Method: log.method,
        Path: log.path,
        Module: log.entityType || '',
        'Entity ID': log.entityId || '',
        'IP Address': log.ipAddress || '',
        Machine: log.machine || '',
        'User Agent': log.userAgent || '',
        'Status Code': log.statusCode || '',
        Params: metadata?.params ? JSON.stringify(metadata.params) : '',
        Query: metadata?.query ? JSON.stringify(metadata.query) : '',
        Body: metadata?.body ? JSON.stringify(metadata.body) : '',
      };
    });

    if (!rows.length) {
      setErrorMsg('No audit logs available to download.');
      return;
    }

    downloadCsv(rows, `Soul2Soul_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>Audit Logs</h1>
          <p className="page-subtitle">Track user actions, affected routes, IP address, device/browser details and sanitized request data.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={downloadAuditLogs}><Download size={18} /> Download</button>
          <button className="btn btn-primary" onClick={refresh}><RefreshCw size={18} /> Refresh</button>
        </div>
      </div>

      {statusMsg && <div className="inline-alert inline-alert-success"><ShieldCheck size={18} /> {statusMsg}</div>}
      {errorMsg && <div className="inline-alert inline-alert-danger">{errorMsg}</div>}

      <div className="card">
        <div className="section-heading">
          <div className="search-input" style={{ marginBottom: 0, flex: 1 }}>
            <Search size={18} />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search action, user, path, or IP..." />
          </div>
          <select className="form-input toolbar-select" value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
            <option value="">All modules</option>
            {entityTypes.map((entityType) => <option key={entityType} value={entityType}>{entityType}</option>)}
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>IP / Machine</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const metadata = parseMetadata(log.metadata);
                const bodyKeys = metadata?.body ? Object.keys(metadata.body).slice(0, 5).join(', ') : '';
                return (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>
                      <strong>{log.userName || log.userEmail || 'System'}</strong>
                      <span className="table-muted">{log.userRole || '-'}</span>
                    </td>
                    <td>
                      <strong>{log.method}</strong>
                      <span className="table-muted">{log.path}</span>
                    </td>
                    <td><span className="badge badge-primary">{log.entityType || '-'}</span></td>
                    <td>
                      {log.ipAddress || '-'}
                      <span className="table-muted">{log.machine || log.userAgent || '-'}</span>
                    </td>
                    <td>
                      <span className="table-muted">{bodyKeys ? `Body: ${bodyKeys}` : 'No request body'}</span>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No audit logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
