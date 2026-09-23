import React, { useState, useEffect } from 'react';
import { X, Radio, Send, Trash2, CheckCircle2, AlertTriangle, ExternalLink, Code2 } from 'lucide-react';
import {
  getN8NConfig,
  saveN8NConfig,
  getEventLogs,
  clearLogs,
  dispatchN8NEvent
} from '../services/n8nService';

export function N8NConfigModal({ isOpen, onClose, onShowToast }) {
  const [config, setConfig] = useState(getN8NConfig());
  const [logs, setLogs] = useState(getEventLogs());
  const [selectedLog, setSelectedLog] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setLogs(getEventLogs());
    };
    window.addEventListener('n8n-log-added', handleUpdate);
    return () => window.removeEventListener('n8n-log-added', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    saveN8NConfig(config);
    onShowToast('n8n configuration updated successfully');
  };

  const handleTestPing = async () => {
    setIsTesting(true);
    await dispatchN8NEvent('test.ping', {
      message: 'Hello n8n Workflow! Test ping from AuraFrame Front Frame.',
      device: 'iOS/Android Simulator',
      sentAt: new Date().toISOString()
    });
    setIsTesting(false);
    onShowToast('Test ping dispatched to n8n webhook!');
  };

  const handleClear = () => {
    clearLogs();
    setLogs([]);
    setSelectedLog(null);
    onShowToast('Event logs cleared');
  };

  return (
    <div className="modal-backdrop-n8n" onClick={onClose}>
      <div className="n8n-console-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="n8n-console-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>n8n Workflow Automation Bridge</h3>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Dynamic Webhook Event Dispatcher</div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: '#94a3b8', padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="n8n-console-body">
          {/* Config Form */}
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group-n8n">
              <label className="form-label-n8n">n8n Webhook Production / Test URL</label>
              <input
                type="url"
                className="input-n8n"
                value={config.webhookUrl}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                placeholder="https://n8n.yourdomain.com/webhook/..."
              />
            </div>

            <div className="form-group-n8n">
              <label className="form-label-n8n">X-AuraFrame-Secret (Auth Header)</label>
              <input
                type="text"
                className="input-n8n"
                value={config.secretToken}
                onChange={(e) => setConfig({ ...config, secretToken: e.target.value })}
                placeholder="Secret key for verification node in n8n"
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                Save Settings
              </button>

              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTesting}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-subtle)',
                  color: '#e2e8f0',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Send size={13} />
                <span>{isTesting ? 'Sending...' : 'Test Webhook Ping'}</span>
              </button>
            </div>
          </form>

          {/* Event Dispatch History */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="form-label-n8n">Dispatched Events Stream ({logs.length})</span>
              {logs.length > 0 && (
                <button
                  onClick={handleClear}
                  style={{ color: '#ef4444', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Trash2 size={12} /> Clear Logs
                </button>
              )}
            </div>

            <div className="logs-box-n8n">
              {logs.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                  No events dispatched yet. Click "Test Webhook Ping" or perform actions in the app!
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="log-item-row"
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    style={{ cursor: 'pointer', background: selectedLog?.id === log.id ? 'rgba(168, 85, 247, 0.1)' : 'transparent' }}
                  >
                    <div>
                      <span style={{ color: '#fff', fontWeight: 600, marginRight: 8 }}>{log.eventType}</span>
                      <span style={{ color: '#64748b' }}>{log.timestamp}</span>
                    </div>
                    <span className={`log-status-badge ${log.status.includes('delivered') ? 'status-delivered' : 'status-simulated'}`}>
                      {log.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Selected Payload Inspector */}
            {selectedLog && (
              <div style={{ marginTop: 10, background: '#090d14', border: '1px solid #1e293b', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#38bdf8', marginBottom: 6 }}>
                  <Code2 size={13} />
                  <span>Payload Inspector: {selectedLog.id}</span>
                </div>
                <pre style={{ color: '#a5f3fc', fontSize: '0.72rem', overflowX: 'auto', maxHeight: 150, fontFamily: 'var(--font-mono)' }}>
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
