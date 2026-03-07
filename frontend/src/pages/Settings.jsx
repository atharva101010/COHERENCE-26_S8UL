import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';
import {
  Settings as SettingsIcon, Key, Plus, Trash2, Eye, EyeOff,
  Bot, Mail, MessageSquare, Smartphone, Shield, CheckCircle2, AlertCircle,
  Ban, RefreshCw, Activity, Loader2, BarChart3, X, Search, RotateCcw
} from 'lucide-react';
import {
  fetchCredentials as fetchCredsFromDB,
  fetchCredentialById,
  createCredential,
  updateCredential,
  deleteCredential,
  fetchBlacklistAPI,
  addToBlacklistAPI,
  removeFromBlacklistAPI,
  fetchDailyStats,
  fetchSafetyScore,
  resetDailyCount,
  resetSeedData,
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

// ─── Skeleton Components ────────────────────────

function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 animate-pulse ${className}`}>
      <div className="h-4 bg-zinc-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-zinc-200 rounded w-1/2 mb-3" />
      <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full w-full mb-2" />
      <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3" />
    </div>
  );
}

SkeletonCard.propTypes = { className: PropTypes.string };

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-4 h-4 bg-zinc-200 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-3.5 bg-zinc-200 rounded w-2/5 mb-1.5" />
        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3" />
      </div>
      <div className="h-5 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
    </div>
  );
}

function SkeletonCredentialGroup() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden animate-pulse">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-200" />
          <div>
            <div className="h-3.5 bg-zinc-200 rounded w-20 mb-1" />
            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded w-14" />
          </div>
        </div>
        <div className="h-7 w-14 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
      </div>
      <div className="px-4 py-6 flex justify-center">
        <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-40" />
      </div>
    </div>
  );
}

// ─── Error Box with Retry ────────────────────────

function ErrorBox({ message, onRetry }) {
  return (
    <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 rounded-xl p-6 text-center">
      <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
      <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Failed to load data</p>
      <p className="text-xs text-red-500 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-700 dark:text-red-300 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:bg-red-900/30 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );
}

ErrorBox.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
};

// ─── Safety Score Gauge SVG ────────────────────

function SafetyGauge({ score, maxScore = 100 }) {
  const pct = Math.round((score / maxScore) * 100);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75; // 270 degree arc
  const offset = arcLength - (arcLength * pct) / 100;

  const getColor = () => {
    if (pct >= 80) return { stroke: '#22c55e', bg: 'from-emerald-50 to-green-50', text: 'text-emerald-600 dark:text-emerald-400', label: 'Excellent' };
    if (pct >= 60) return { stroke: '#3b82f6', bg: 'from-blue-50 to-indigo-50', text: 'text-blue-600 dark:text-blue-400', label: 'Good' };
    if (pct >= 40) return { stroke: '#f59e0b', bg: 'from-amber-50 to-yellow-50', text: 'text-amber-600 dark:text-amber-400', label: 'Fair' };
    return { stroke: '#ef4444', bg: 'from-red-50 to-orange-50', text: 'text-red-600 dark:text-red-400', label: 'Needs Attention' };
  };

  const colors = getColor();

  return (
    <div className={`flex flex-col items-center justify-center p-6 bg-gradient-to-br ${colors.bg} rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60`}>
      <svg width="180" height="150" viewBox="0 0 180 150" className="mb-2">
        {/* Background arc */}
        <circle
          cx="90" cy="90" r={radius}
          fill="none" stroke="#e4e4e7" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform="rotate(135 90 90)"
        />
        {/* Progress arc */}
        <circle
          cx="90" cy="90" r={radius}
          fill="none" stroke={colors.stroke} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={offset}
          transform="rotate(135 90 90)"
          className="transition-all duration-1000 ease-out"
        />
        {/* Score text */}
        <text x="90" y="82" textAnchor="middle" className="text-3xl font-bold" fill={colors.stroke} fontSize="36">
          {pct}
        </text>
        <text x="90" y="108" textAnchor="middle" fill="#71717a" fontSize="13">
          / 100
        </text>
      </svg>
      <div className={`text-sm font-semibold ${colors.text}`}>{colors.label}</div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{score} of {maxScore} points</div>
    </div>
  );
}

SafetyGauge.propTypes = {
  score: PropTypes.number.isRequired,
  maxScore: PropTypes.number,
};

function parseCredConfig(config) {
  try { return typeof config === 'string' ? JSON.parse(config) : config; } catch { return {}; }
}

export default function Settings() {
  const [tab, setTab] = useState('safety');
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [credError, setCredError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'groq', config: {} });
  const [saving, setSaving] = useState(false);
  const [revealedIds, setRevealedIds] = useState(new Set());
  const [revealedData, setRevealedData] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  // Blacklist state
  const [blacklist, setBlacklist] = useState([]);
  const [blLoading, setBlLoading] = useState(true);
  const [blError, setBlError] = useState(null);
  const [blEmail, setBlEmail] = useState('');
  const [blReason, setBlReason] = useState('');
  const [blSearch, setBlSearch] = useState('');
  const [blAdding, setBlAdding] = useState(false);
  const [blRemovingId, setBlRemovingId] = useState(null);

  // Safety/Daily state
  const [safetyData, setSafetyData] = useState(null);
  const [dailyStats, setDailyStats] = useState(null);
  const [safetyLoading, setSafetyLoading] = useState(true);
  const [safetyError, setSafetyError] = useState(null);
  const [resettingDaily, setResettingDaily] = useState(false);

  const loadCredentials = useCallback(() => {
    setLoading(true);
    setCredError(null);
    fetchCredsFromDB()
      .then(creds => {
        setCredentials(creds || []);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        setCredError(err.message || 'Failed to load credentials');
        toast.error(err.message || 'Failed to load credentials');
      });
  }, []);

  const loadBlacklist = useCallback(() => {
    setBlLoading(true);
    setBlError(null);
    fetchBlacklistAPI()
      .then(data => { setBlacklist(data || []); setBlLoading(false); })
      .catch(err => {
        setBlLoading(false);
        setBlError(err.message || 'Failed to load blacklist');
        toast.error(err.message || 'Failed to load blacklist');
      });
  }, []);

  const loadSafety = useCallback(() => {
    setSafetyLoading(true);
    setSafetyError(null);
    Promise.all([fetchSafetyScore(), fetchDailyStats()])
      .then(([safety, daily]) => {
        setSafetyData(safety);
        setDailyStats(daily);
        setSafetyLoading(false);
      })
      .catch(err => {
        setSafetyLoading(false);
        setSafetyError(err.message || 'Failed to load safety data');
      });
  }, []);

  useEffect(() => {
    loadCredentials();
    loadBlacklist();
    loadSafety();
  }, [loadCredentials, loadBlacklist, loadSafety]);

  const handleAddBlacklist = async () => {
    if (!blEmail.trim()) { toast.error('Email or domain is required'); return; }
    setBlAdding(true);
    try {
      await addToBlacklistAPI(blEmail.trim(), blReason.trim() || null);
      toast.success(`Added ${blEmail.trim()} to blacklist`);
      setBlEmail(''); setBlReason('');
      loadBlacklist();
      loadSafety();
    } catch (err) {
      toast.error(err.message || 'Failed to add to blacklist');
    } finally {
      setBlAdding(false);
    }
  };

  const handleRemoveBlacklist = async (id, email) => {
    setBlRemovingId(id);
    try {
      await removeFromBlacklistAPI(id);
      toast.success(`Removed ${email} from blacklist`);
      loadBlacklist();
      loadSafety();
    } catch (err) {
      toast.error(err.message || 'Failed to remove from blacklist');
    } finally {
      setBlRemovingId(null);
    }
  };

  const handleResetDaily = async () => {
    setResettingDaily(true);
    try {
      await resetDailyCount();
      toast.success('Daily count reset');
      loadSafety();
    } catch (err) {
      toast.error(err.message || 'Failed to reset daily count');
    } finally {
      setResettingDaily(false);
    }
  };

  const [resettingSeed, setResettingSeed] = useState(false);
  const handleResetSeed = async () => {
    setResettingSeed(true);
    try {
      await resetSeedData();
      toast.success('Demo data reset! Refreshing...');
      loadSafety();
      loadBlacklist();
      loadCredentials();
    } catch (err) {
      toast.error(err.message || 'Failed to reset demo data');
    } finally {
      setResettingSeed(false);
    }
  };

  const openAdd = (type) => {
    setEditId(null);
    setForm({ name: '', type, config: {} });
    setShowModal(true);
  };

  const openEdit = async (cred) => {
    try {
      const full = await fetchCredentialById(cred.id);
      setEditId(cred.id);
      setForm({ name: full.name, type: full.type, config: typeof full.config === 'string' ? parseCredConfig(full.config) : full.config });
      setShowModal(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load credential');
    }
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
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
      loadCredentials();
    } catch (err) {
      toast.error(err.message || 'Failed to save credential');
    } finally {
      setSaving(false);
    }
  };

  const deleteCred = async (id) => {
    setDeletingId(id);
    try {
      await deleteCredential(id);
      toast.success('Credential deleted');
      loadCredentials();
    } catch (err) {
      toast.error(err.message || 'Failed to delete credential');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleReveal = async (id) => {
    if (revealedIds.has(id)) {
      setRevealedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      return;
    }
    try {
      const full = await fetchCredentialById(id);
      setRevealedData(prev => ({ ...prev, [id]: typeof full.config === 'string' ? parseCredConfig(full.config) : full.config }));
      setRevealedIds(prev => new Set(prev).add(id));
    } catch (err) {
      toast.error(err.message || 'Failed to fetch credential');
    }
  };

  const currentFields = credentialTypes.find(c => c.type === form.type)?.fields || [];

  const filteredBlacklist = blacklist.filter(b =>
    b.email.toLowerCase().includes(blSearch.toLowerCase()) ||
    (b.reason || '').toLowerCase().includes(blSearch.toLowerCase())
  );

  const tabs = [
    { id: 'safety', label: 'Safety Score', icon: Shield },
    { id: 'blacklist', label: 'Blacklist', icon: Ban },
    { id: 'credentials', label: 'API Keys', icon: Key },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Safety controls, blacklist, and credentials</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleResetSeed} disabled={resettingSeed} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:bg-amber-900/40 transition-colors disabled:opacity-50">
            {resettingSeed ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset Demo Data
          </button>
          <button onClick={() => { loadSafety(); loadBlacklist(); loadCredentials(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                tab === t.id ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
              {t.id === 'blacklist' && blacklist.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-bold">{blacklist.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── SAFETY SCORE TAB ─── */}
      {tab === 'safety' && (
        <div className="space-y-4">
          {safetyLoading && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SkeletonCard className="h-52" />
                <SkeletonCard className="h-52" />
                <SkeletonCard className="h-52" />
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="h-4 bg-zinc-200 rounded w-28 animate-pulse" />
                </div>
                {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
              </div>
            </div>
          )}
          {!safetyLoading && safetyError && (
            <ErrorBox message={safetyError} onRetry={loadSafety} />
          )}
          {!safetyLoading && !safetyError && safetyData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SafetyGauge score={safetyData.score} maxScore={safetyData.maxScore} />

                {/* Daily Stats */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Daily Send Limit</h3>
                    </div>
                    {dailyStats && (
                      <>
                        <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{dailyStats.sent} <span className="text-lg text-zinc-400 font-normal">/ {dailyStats.limit}</span></div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 mt-3">
                          <div
                            className={`h-2.5 rounded-full transition-all ${(() => {
                              if (dailyStats.sent >= dailyStats.limit) return 'bg-red-500';
                              if (dailyStats.sent >= dailyStats.limit * 0.8) return 'bg-amber-500';
                              return 'bg-emerald-500';
                            })()}`}
                            style={{ width: `${Math.min((dailyStats.sent / dailyStats.limit) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                          {dailyStats.remaining} emails remaining today
                        </p>
                      </>
                    )}
                  </div>
                  <button onClick={handleResetDaily} disabled={resettingDaily} className="mt-3 flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50">
                    {resettingDaily ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Reset Today&apos;s Count
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Quick Stats</h3>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Blacklist entries</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{blacklist.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Credentials</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{credentials.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 dark:text-zinc-400">Safety checks</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{safetyData.checks?.filter(c => c.passed).length || 0} / {safetyData.checks?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checks List */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Safety Checks</h3>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(safetyData.checks || []).map((check) => (
                    <div key={check.name} className="flex items-center gap-3 px-4 py-3">
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{check.name}</p>
                        {check.detail && <p className="text-xs text-zinc-400">{check.detail}</p>}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${check.passed ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-500'}`}>
                        {check.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {!safetyLoading && !safetyError && !safetyData && (
            <ErrorBox message="No safety data available" onRetry={loadSafety} />
          )}
        </div>
      )}

      {/* ─── BLACKLIST TAB ─── */}
      {tab === 'blacklist' && (
        <div className="space-y-4">
          {/* Add to blacklist */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-500" /> Add to Blacklist
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={blEmail}
                onChange={e => setBlEmail(e.target.value)}
                placeholder="Email or domain (e.g. spam@test.com or @test.com)"
                className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <input
                type="text"
                value={blReason}
                onChange={e => setBlReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-48 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              <button onClick={handleAddBlacklist} disabled={blAdding} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50">
                {blAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Block
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={blSearch}
              onChange={e => setBlSearch(e.target.value)}
              placeholder="Search blacklist..."
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Blacklist entries */}
          {blError && !blLoading && (
            <ErrorBox message={blError} onRetry={loadBlacklist} />
          )}
          {!blError && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {blLoading && (
              <div>
                {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
              </div>
            )}
            {!blLoading && filteredBlacklist.length === 0 && (
              <div className="py-12 text-center">
                <Ban className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">{blSearch ? 'No matching entries' : 'Blacklist is empty'}</p>
              </div>
            )}
            {!blLoading && filteredBlacklist.length > 0 && (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredBlacklist.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{entry.email}</p>
                        {entry.reason && <p className="text-xs text-zinc-400 truncate">{entry.reason}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveBlacklist(entry.id, entry.email)} disabled={blRemovingId === entry.id} className="p-1.5 text-zinc-400 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50">
                      {blRemovingId === entry.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* ─── CREDENTIALS TAB ─── */}
      {tab === 'credentials' && (
        <div className="space-y-4">
          {/* Security Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Credentials are stored securely</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">API keys are stored in your Supabase database. Masked in the UI, revealed on demand.</p>
            </div>
          </div>

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <SkeletonCredentialGroup key={i} />)}
            </div>
          )}
          {!loading && credError && (
            <ErrorBox message={credError} onRetry={loadCredentials} />
          )}
          {!loading && !credError && (
            <div className="space-y-4">
              {credentialTypes.map(ct => {
                const Icon = ct.icon;
                const creds = credentials.filter(c => c.type === ct.type);
                return (
                  <div key={ct.type} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg ${ct.color} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ct.label}</h3>
                          <p className="text-[11px] text-zinc-400">{creds.length} configured</p>
                        </div>
                      </div>
                      <button onClick={() => openAdd(ct.type)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:border-zinc-600 transition-colors">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {creds.length > 0 && (
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {creds.map(cred => {
                          const config = revealedIds.has(cred.id) ? revealedData[cred.id] : parseCredConfig(cred.config);
                          return (
                            <div key={cred.id} className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{cred.name}</p>
                                  <p className="text-xs text-zinc-400 font-mono truncate">{Object.values(config)[0] || '***'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => toggleReveal(cred.id)} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                                  {revealedIds.has(cred.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => openEdit(cred)} className="p-1.5 text-zinc-400 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:bg-indigo-900/30 rounded-lg transition-colors">
                                  <SettingsIcon className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deleteCred(cred.id)} disabled={deletingId === cred.id} className="p-1.5 text-zinc-400 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50">
                                  {deletingId === cred.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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
        </div>
      )}

      {/* Add/Edit Credential Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {editId ? 'Edit' : 'Add'} {credentialTypes.find(c => c.type === form.type)?.label} Credential
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label htmlFor="cred-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                <input
                  id="cred-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. My Groq Key"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              {!editId && (
                <div>
                  <label htmlFor="cred-type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
                  <select
                    id="cred-type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value, config: {} })}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    {credentialTypes.map(ct => <option key={ct.type} value={ct.type}>{ct.label}</option>)}
                  </select>
                </div>
              )}
              {currentFields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{field.label}</label>
                  <input
                    type={field.secret ? 'password' : 'text'}
                    value={form.config[field.key] || ''}
                    onChange={(e) => setForm({ ...form, config: { ...form.config, [field.key]: e.target.value } })}
                    placeholder={field.secret ? '••••••••••••••••' : `Enter ${field.label.toLowerCase()}...`}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-zinc-200 dark:border-zinc-700">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
