import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon, Key, Plus, Trash2, Eye, EyeOff,
  Bot, Mail, MessageSquare, Smartphone, Shield, CheckCircle2, AlertCircle
} from 'lucide-react';
import {
  fetchCredentials as fetchCredsFromDB,
  fetchCredentialById,
  createCredential,
  updateCredential,
  deleteCredential,
} from '../lib/supabaseService';

const credentialTypes = [
  { type: 'groq', label: 'Groq', icon: Bot, color: 'bg-orange-500', fields: [{ key: 'apiKey', label: 'API Key', secret: true }] },
  { type: 'openai', label: 'OpenAI', icon: Bot, color: 'bg-emerald-600', fields: [{ key: 'apiKey', label: 'API Key', secret: true }] },
  { type: 'anthropic', label: 'Anthropic', icon: Bot, color: 'bg-amber-700', fields: [{ key: 'apiKey', label: 'API Key', secret: true }] },
  { type: 'google', label: 'Google AI', icon: Bot, color: 'bg-blue-600', fields: [{ key: 'apiKey', label: 'API Key', secret: true }] },
  { type: 'smtp', label: 'SMTP (Email)', icon: Mail, color: 'bg-blue-500', fields: [
    { key: 'host', label: 'SMTP Host' },
    { key: 'port', label: 'Port' },
    { key: 'user', label: 'Username' },
    { key: 'pass', label: 'Password', secret: true },
  ]},
  { type: 'slack', label: 'Slack', icon: MessageSquare, color: 'bg-green-600', fields: [{ key: 'token', label: 'Bot Token', secret: true }] },
  { type: 'twilio', label: 'Twilio (SMS)', icon: Smartphone, color: 'bg-violet-600', fields: [
    { key: 'accountSid', label: 'Account SID' },
    { key: 'authToken', label: 'Auth Token', secret: true },
    { key: 'fromNumber', label: 'From Number' },
  ]},
  { type: 'api_key', label: 'Generic API Key', icon: Key, color: 'bg-zinc-600', fields: [{ key: 'apiKey', label: 'API Key', secret: true }] },
];

export default function Settings() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'groq', config: {} });
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [revealedData, setRevealedData] = useState({});

  const fetchCredentials = () => {
    fetchCredsFromDB().then(creds => {
      setCredentials(creds || []);
      setLoading(false);
    }).catch(() => { setLoading(false); toast.error('Failed to load credentials'); });
  };

  useEffect(() => { fetchCredentials(); }, []);

  const openAdd = (type) => {
    setEditId(null);
    setForm({ name: '', type, config: {} });
    setShowModal(true);
  };

  const openEdit = async (cred) => {
    try {
      const full = await fetchCredentialById(cred.id);
      setEditId(cred.id);
      setForm({ name: full.name, type: full.type, config: typeof full.config === 'string' ? JSON.parse(full.config) : full.config });
      setShowModal(true);
    } catch {
      toast.error('Failed to load credential');
    }
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      const payload = { name: form.name, type: form.type, config: form.config };
      if (editId) {
        await updateCredential(editId, payload);
        toast.success('Credential updated');
      } else {
        await createCredential(payload);
        toast.success('Credential added');
      }
      setShowModal(false);
      fetchCredentials();
    } catch {
      toast.error('Failed to save credential');
    }
  };

  const deleteCred = async (id) => {
    try {
      await deleteCredential(id);
      toast.success('Credential deleted');
      fetchCredentials();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleReveal = async (id) => {
    if (revealedIds.has(id)) {
      setRevealedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      return;
    }
    try {
      const full = await fetchCredentialById(id);
      setRevealedData(prev => ({ ...prev, [id]: typeof full.config === 'string' ? JSON.parse(full.config) : full.config }));
      setRevealedIds(prev => new Set(prev).add(id));
    } catch {
      toast.error('Failed to fetch credential');
    }
  };

  const currentFields = credentialTypes.find(c => c.type === form.type)?.fields || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Settings</h2>
            <p className="text-sm text-zinc-500">Manage API keys, credentials, and integrations</p>
          </div>
        </div>
      </div>

      {/* Security Banner */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Credentials are stored securely</p>
          <p className="text-xs text-emerald-600 mt-0.5">API keys are stored securely in your Supabase database. They are masked in the UI and only revealed on demand.</p>
        </div>
      </div>

      {/* Credential Cards by Type */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400">Loading credentials...</div>
      ) : (
      <div className="space-y-4">
        {credentialTypes.map(ct => {
          const Icon = ct.icon;
          const creds = credentials.filter(c => c.type === ct.type);
          return (
            <div key={ct.type} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg ${ct.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">{ct.label}</h3>
                    <p className="text-[11px] text-zinc-400">{creds.length} configured</p>
                  </div>
                </div>
                <button
                  onClick={() => openAdd(ct.type)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {creds.length > 0 && (
                <div className="divide-y divide-zinc-100">
                  {creds.map(cred => {
                    const config = revealedIds.has(cred.id) ? revealedData[cred.id] : JSON.parse(cred.config);
                    return (
                      <div key={cred.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-800 truncate">{cred.name}</p>
                            <p className="text-xs text-zinc-400 font-mono truncate">
                              {Object.values(config)[0] || '***'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleReveal(cred.id)} className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                            {revealedIds.has(cred.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => openEdit(cred)} className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <SettingsIcon className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteCred(cred.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {creds.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <AlertCircle className="w-5 h-5 text-zinc-300 mx-auto mb-1" />
                  <p className="text-xs text-zinc-400">No {ct.label} credentials configured</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-5 border-b border-zinc-200">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editId ? 'Edit' : 'Add'} {credentialTypes.find(c => c.type === form.type)?.label} Credential
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="cred-name" className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
                <input
                  id="cred-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. My Groq Key"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              {!editId && (
                <div>
                  <label htmlFor="cred-type" className="block text-sm font-medium text-zinc-700 mb-1">Type</label>
                  <select
                    id="cred-type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value, config: {} })}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    {credentialTypes.map(ct => <option key={ct.type} value={ct.type}>{ct.label}</option>)}
                  </select>
                </div>
              )}
              {currentFields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{field.label}</label>
                  <input
                    type={field.secret ? 'password' : 'text'}
                    value={form.config[field.key] || ''}
                    onChange={(e) => setForm({ ...form, config: { ...form.config, [field.key]: e.target.value } })}
                    placeholder={field.secret ? '••••••••••••••••' : `Enter ${field.label.toLowerCase()}...`}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-zinc-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={save} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                {editId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
