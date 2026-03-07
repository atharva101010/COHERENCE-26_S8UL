import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Building, Link2, CheckCircle, XCircle, ArrowUpRight, Settings, Loader2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchCRMIntegrations, connectCRM, disconnectCRM as disconnectCRMAPI, updateCRMIntegration, chatWithAI } from '../lib/supabaseService';
import { safeJsonParse } from '../lib/utils';

const CRM_PROVIDERS = [
  { id: 'hubspot', name: 'HubSpot', color: '#FF7A59', description: 'Sync leads and track engagement with HubSpot CRM', fields: ['API Key', 'Hub ID'] },
  { id: 'salesforce', name: 'Salesforce', color: '#00A1E0', description: 'Connect with Salesforce to manage contacts and deals', fields: ['Client ID', 'Client Secret', 'Instance URL'] },
  { id: 'pipedrive', name: 'Pipedrive', color: '#017737', description: 'Sync leads and deals with Pipedrive CRM', fields: ['API Token', 'Company Domain'] },
  { id: 'zoho', name: 'Zoho CRM', color: '#E42527', description: 'Integrate with Zoho CRM for lead management', fields: ['Client ID', 'Client Secret', 'Refresh Token'] },
  { id: 'freshsales', name: 'Freshsales', color: '#F37321', description: 'Connect with Freshsales for advanced lead tracking', fields: ['API Key', 'Domain'] },
  { id: 'notion', name: 'Notion', color: '#000000', description: 'Sync lead data with Notion databases', fields: ['Integration Token', 'Database ID'] },
];

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-200" />
          <div>
            <div className="h-4 w-24 bg-zinc-200 rounded mb-1.5" />
            <div className="h-3 w-40 bg-zinc-100 dark:bg-zinc-800 rounded" />
          </div>
        </div>
        <div className="w-5 h-5 bg-zinc-200 rounded-full" />
      </div>
      <div className="h-9 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
    </div>
  );
}

function formatTimestamp(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function CRMIntegrations() {
  const [integrations, setIntegrations] = useState([]);
  const [configuring, setConfiguring] = useState(null);
  const [configs, setConfigs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const [aiTip, setAiTip] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const connectedMap = {};
  const syncStatusMap = {};
  const integrationIdMap = {};
  const updatedAtMap = {};
  for (const item of integrations) {
    if (item.is_connected) {
      connectedMap[item.provider] = true;
      syncStatusMap[item.provider] = item.sync_status || 'idle';
      integrationIdMap[item.provider] = item.id;
      updatedAtMap[item.provider] = item.updated_at;
    }
  }

  const connectedCount = Object.values(connectedMap).filter(Boolean).length;

  const loadIntegrations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCRMIntegrations();
      setIntegrations(data);
      const cfgMap = {};
      for (const item of data) {
        if (item.is_connected && item.config) {
          cfgMap[item.provider] = typeof item.config === 'string' ? safeJsonParse(item.config, {}) : item.config;
        }
      }
      setConfigs(cfgMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const toggleConnect = (id) => {
    if (connectedMap[id]) {
      handleDisconnect(id);
    } else {
      setConfiguring(id);
    }
  };

  const handleDisconnect = async (providerId) => {
    setDisconnecting(providerId);
    try {
      await disconnectCRMAPI(providerId);
      setIntegrations(prev => prev.map(i =>
        i.provider === providerId ? { ...i, is_connected: false } : i
      ));
      toast.success(`${CRM_PROVIDERS.find(c => c.id === providerId)?.name} disconnected`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleSaveConfig = async (id) => {
    const provider = CRM_PROVIDERS.find(c => c.id === id);
    const cfg = configs[id] ?? {};
    const allFilled = provider.fields.every(f => cfg[f]?.trim());
    if (!allFilled) return toast.error(`Please fill all ${provider.name} fields`);

    setSubmitting(id);
    try {
      const data = await connectCRM({ provider: id, config: cfg });
      setIntegrations(prev => {
        const existing = prev.find(i => i.provider === id);
        if (existing) {
          return prev.map(i => i.provider === id ? { ...data, is_connected: true } : i);
        }
        return [...prev, { ...data, is_connected: true }];
      });
      setConfiguring(null);
      toast.success(`${provider.name} connected successfully`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleUpdateConfig = async (id) => {
    const provider = CRM_PROVIDERS.find(c => c.id === id);
    const cfg = configs[id] ?? {};
    const allFilled = provider.fields.every(f => cfg[f]?.trim());
    if (!allFilled) return toast.error(`Please fill all ${provider.name} fields`);

    const integrationId = integrationIdMap[id];
    if (!integrationId) return toast.error('Integration not found');

    setSubmitting(id);
    try {
      const data = await updateCRMIntegration(integrationId, { config: cfg });
      setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, ...data } : i));
      setConfiguring(null);
      toast.success(`${provider.name} configuration updated`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const updateConfig = (id, field, value) => {
    setConfigs(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value } }));
  };

  const getAITip = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const connectedNames = Object.entries(connectedMap)
        .filter(([, v]) => v)
        .map(([k]) => CRM_PROVIDERS.find(c => c.id === k)?.name)
        .filter(Boolean);
      const data = await chatWithAI({
        message: `I have ${connectedNames.length > 0 ? connectedNames.join(', ') + ' connected' : 'no CRM connected yet'} in FlowReach AI. Give me a 2-sentence tip on maximizing CRM integration for B2B lead outreach.`,
        context: 'CRM integrations page — helping user optimize their CRM configuration',
      });
      setAiTip(data.reply);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <div className="h-7 w-48 bg-zinc-200 rounded animate-pulse" />
          <div className="h-4 w-72 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-3 w-20 bg-zinc-200 rounded mb-2" />
              <div className="h-7 w-12 bg-zinc-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-xl p-6 text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-1">Failed to load CRM integrations</h2>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={loadIntegrations} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center gap-1.5">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Building className="text-primary" /> CRM Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect FlowReach AI with your favorite CRM platforms &mdash; {connectedCount} connected</p>
        </div>
        <button onClick={loadIntegrations} className="p-2 rounded-lg border border-border hover:bg-muted" title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Available CRMs</p>
          <p className="text-2xl font-bold mt-1">{CRM_PROVIDERS.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Connected</p>
          <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{connectedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Sync Status</p>
          <p className={`text-2xl font-bold mt-1 ${connectedCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-zinc-400'}`}>
            {connectedCount > 0 ? 'Active' : 'Idle'}
          </p>
        </div>
      </div>

      {/* CRM Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CRM_PROVIDERS.map(crm => {
          const isConnected = connectedMap[crm.id];
          const syncStatus = syncStatusMap[crm.id];
          const lastUpdated = updatedAtMap[crm.id];
          const isSubmitting = submitting === crm.id;
          const isDisconnecting = disconnecting === crm.id;

          return (
            <div key={crm.id} className={`bg-card border rounded-xl p-5 space-y-4 ${isConnected ? 'border-green-200' : 'border-border'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: crm.color }}>{crm.name[0]}</div>
                  <div>
                    <h3 className="font-semibold text-sm">{crm.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{crm.description}</p>
                  </div>
                </div>
                {isConnected ? <CheckCircle size={18} className="text-green-500 flex-shrink-0" /> : <XCircle size={18} className="text-zinc-300 flex-shrink-0" />}
              </div>

              {isConnected && (
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
                    Sync: {syncStatus || 'idle'}
                  </span>
                  {lastUpdated && <span>Updated: {formatTimestamp(lastUpdated)}</span>}
                </div>
              )}

              {configuring === crm.id && (
                <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                  {crm.fields.map(field => (
                    <div key={field}>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">{field}</label>
                      <input
                        value={configs[crm.id]?.[field] || ''}
                        onChange={e => updateConfig(crm.id, field, e.target.value)}
                        placeholder={field}
                        className="w-full px-3 py-1.5 text-xs border border-border rounded bg-background"
                        type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('key') || field.toLowerCase().includes('token') ? 'password' : 'text'}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => isConnected ? handleUpdateConfig(crm.id) : handleSaveConfig(crm.id)}
                      disabled={isSubmitting}
                      className="flex-1 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {isSubmitting
                        ? <><Loader2 size={12} className="animate-spin" /> Saving...</>
                        : (isConnected ? 'Update Config' : 'Connect')
                      }
                    </button>
                    <button onClick={() => setConfiguring(null)} disabled={isSubmitting} className="px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded-lg">Cancel</button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => toggleConnect(crm.id)}
                  disabled={isDisconnecting || isSubmitting}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors ${isConnected ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:bg-red-900/40' : 'bg-primary/10 text-primary hover:bg-primary/20'} disabled:opacity-50`}
                >
                  {isDisconnecting ? (
                    <><Loader2 size={12} className="animate-spin" /> Disconnecting...</>
                  ) : (
                    <><Link2 size={12} /> {isConnected ? 'Disconnect' : 'Connect'}</>
                  )}
                </button>
                {isConnected && (
                  <button onClick={() => setConfiguring(crm.id)} disabled={isDisconnecting} className="px-3 py-2 text-xs bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80" title="Configure">
                    <Settings size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ArrowUpRight size={14} className="text-primary" /> How CRM Integration Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">1</span><p>Connect your CRM using API credentials. Your data stays secure.</p></div>
          <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">2</span><p>Leads sync automatically between FlowReach and your CRM.</p></div>
          <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">3</span><p>Track engagement, update statuses, and manage deals in one place.</p></div>
        </div>
      </div>

      {/* AI Tip */}
      <div className="bg-violet-50 dark:bg-violet-900/30 border border-violet-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-violet-700 dark:text-violet-300"><Sparkles size={14} /> AI Integration Tip</h3>
          <button onClick={getAITip} disabled={aiLoading} className="px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1">
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {aiLoading ? 'Thinking...' : 'Get AI Tip'}
          </button>
        </div>
        {aiError && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-red-600 dark:text-red-400 flex-1">{aiError}</p>
            <button onClick={getAITip} className="text-xs text-violet-700 dark:text-violet-300 underline hover:text-violet-900">Retry</button>
          </div>
        )}
        {!aiError && aiTip && (
          <p className="text-xs text-violet-600 dark:text-violet-400">{aiTip}</p>
        )}
        {!aiError && !aiTip && (
          <p className="text-xs text-violet-400">Click &quot;Get AI Tip&quot; for personalized advice on maximizing your CRM integrations.</p>
        )}
      </div>
    </div>
  );
}
