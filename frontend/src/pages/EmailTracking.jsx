import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { MailCheck, Eye, MousePointerClick, TrendingUp, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchTrackingStats, fetchEmailEvents, fetchMessages } from '../lib/supabaseService';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444'];
const MSG_STATUS_COLORS = {
  sent: 'bg-green-100 text-green-700 dark:text-green-300',
  delivered: 'bg-green-100 text-green-700 dark:text-green-300',
  opened: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  failed: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};
const EVENT_TYPE_COLORS = {
  open: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  click: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
};

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtDate = (d) => d ? new Date(d).toLocaleString() : '\u2014';

export default function EmailTracking() {
  const [stats, setStats] = useState({ totalSent: 0, totalOpened: 0, opens: 0, clicks: 0, openRate: 0 });
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('messages');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, msgsData, eventsData] = await Promise.all([
        fetchTrackingStats(),
        fetchMessages({ limit: 50 }),
        fetchEmailEvents(100),
      ]);
      setStats(statsData);
      setMessages(Array.isArray(msgsData) ? msgsData : msgsData.messages || []);
      setEvents(eventsData);
    } catch (err) {
      setError(err.message || 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const barData = [
    { name: 'Sent', value: stats.totalSent || 0 },
    { name: 'Opened', value: stats.totalOpened || 0 },
    { name: 'Clicks', value: stats.clicks || 0 },
  ];

  const pieData = [
    { name: 'Opened', value: stats.totalOpened || 0 },
    { name: 'Not Opened', value: Math.max(0, (stats.totalSent || 0) - (stats.totalOpened || 0)) },
  ];

  const recentMessages = messages.slice(0, 20).map(m => ({
    ...m,
    leadName: m.leads?.name || m.lead_name || `Lead #${m.lead_id}`,
    hasOpened: m.status === 'opened' || !!m.opened_at,
    hasClicked: !!m.clicked_at,
  }));

  const StatsSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-card border border-border rounded-xl p-4">
          <div className="h-4 w-20 bg-muted animate-pulse rounded mb-3" />
          <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  );

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><MailCheck className="text-primary" /> Email Tracking</h1>
        </div>
        <div className="text-center py-16">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={load} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-1.5">
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><MailCheck className="text-primary" /> Email Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Track opens, clicks, and engagement metrics</p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-muted disabled:opacity-50" title="Refresh">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats Cards */}
      {loading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Sent', value: fmt(stats.totalSent), icon: MailCheck, color: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Total Opened', value: fmt(stats.totalOpened), icon: Eye, color: 'text-green-600 dark:text-green-400' },
            { label: 'Total Clicks', value: fmt(stats.clicks), icon: MousePointerClick, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Open Rate', value: `${Number(stats.openRate || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400' },
          ].map(card => (
            <div key={card.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><card.icon size={16} className={card.color} /><span className="text-xs text-muted-foreground">{card.label}</span></div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 size={14} /> Email Funnel</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Open Rate Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, idx) => <Cell key={entry.name} fill={COLORS[idx]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Opened ({fmt(stats.totalOpened)})</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Not Opened ({fmt(Math.max(0, (stats.totalSent || 0) - (stats.totalOpened || 0)))})</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('messages')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'messages' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Recent Messages
        </button>
        <button
          onClick={() => setTab('events')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'events' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Tracking Events
        </button>
      </div>

      {/* Recent Messages Tab */}
      {tab === 'messages' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
          ) : recentMessages.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <MailCheck size={40} className="mx-auto mb-3 opacity-30" />
              <p>No messages sent yet. Run a workflow to start tracking email engagement.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Lead</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Subject</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Channel</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-muted-foreground">Opened</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-muted-foreground">Clicked</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Sent</th>
                </tr></thead>
                <tbody>
                  {recentMessages.map(m => (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 text-sm">{m.leadName}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground truncate max-w-[200px]">{m.subject || '\u2014'}</td>
                      <td className="px-4 py-2 text-sm capitalize text-muted-foreground">{m.channel || 'email'}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${MSG_STATUS_COLORS[m.status] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>{m.status}</span></td>
                      <td className="px-4 py-2 text-center">{m.hasOpened ? <Eye size={14} className="inline text-green-600 dark:text-green-400" /> : <span className="text-muted-foreground">\u2014</span>}</td>
                      <td className="px-4 py-2 text-center">{m.hasClicked ? <MousePointerClick size={14} className="inline text-amber-600 dark:text-amber-400" /> : <span className="text-muted-foreground">\u2014</span>}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{fmtDate(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tracking Events Tab */}
      {tab === 'events' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Eye size={40} className="mx-auto mb-3 opacity-30" />
              <p>No tracking events recorded yet. Events appear when recipients open or click emails.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50"><tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Event</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Lead</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Subject</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">URL</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Time</th>
                </tr></thead>
                <tbody>
                  {events.map(ev => (
                    <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${EVENT_TYPE_COLORS[ev.event_type] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>{ev.event_type}</span>
                      </td>
                      <td className="px-4 py-2 text-sm">{ev.messages?.leads?.name || `Message #${ev.message_id}`}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground truncate max-w-[200px]">{ev.messages?.subject || '\u2014'}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[180px]">{ev.url || '\u2014'}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{fmtDate(ev.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
