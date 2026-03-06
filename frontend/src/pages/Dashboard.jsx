import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Users, GitBranch, Play, Mail, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchStatsOverview } from '../lib/supabaseService';

const STATUS_COLORS = {
  new: '#6366f1',
  contacted: '#f59e0b',
  replied: '#22c55e',
  converted: '#10b981',
  bounced: '#ef4444',
  unsubscribed: '#a1a1aa',
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 animate-pulse">
      <div className="h-4 bg-zinc-200 rounded w-24 mb-4" />
      <div className="h-8 bg-zinc-200 rounded w-16 mb-2" />
      <div className="h-3 bg-zinc-100 rounded w-20" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 animate-pulse">
      <div className="h-5 bg-zinc-200 rounded w-40 mb-6" />
      <div className="h-52 bg-zinc-100 rounded" />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, iconBg, iconColor, change, changeType }) { // eslint-disable-line react/prop-types
  const changeColorMap = { up: 'text-emerald-600', down: 'text-red-500' };
  const changeColor = changeColorMap[changeType] || 'text-zinc-400';
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 hover:shadow-md hover:shadow-zinc-200/50 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className="text-3xl font-bold text-zinc-900 mt-2">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${changeColor}`}>
              {changeType === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {changeType === 'down' && <ArrowDownRight className="w-3 h-3" />}
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-lg shadow-zinc-200/50">
      <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    value: PropTypes.number,
    color: PropTypes.string,
  })),
  label: PropTypes.string,
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await fetchStatsOverview();
      setStats(data);
    } catch {
      // silent fail — dashboard will show skeletons
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Dashboard</h2>
            <p className="text-sm text-zinc-500 mt-1">Loading your outreach overview...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  const statusData = (stats?.leadsByStatus || []).map((item) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    fill: STATUS_COLORS[item.status] || '#a1a1aa',
  }));

  const messageData = (stats?.messagesLast7Days || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
    messages: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Dashboard</h2>
          <p className="text-sm text-zinc-500 mt-1">Your outreach performance at a glance</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 hover:text-zinc-800 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads ?? 0}
          icon={Users}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          change={stats?.totalLeads > 0 ? 'Active pipeline' : 'Import leads to start'}
          changeType={stats?.totalLeads > 0 ? 'up' : null}
        />
        <StatCard
          title="Workflows"
          value={stats?.totalWorkflows ?? 0}
          icon={GitBranch}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          change={`${stats?.activeWorkflows ?? 0} active`}
          changeType={stats?.activeWorkflows > 0 ? 'up' : null}
        />
        <StatCard
          title="Executions"
          value={stats?.totalExecutions ?? 0}
          icon={Play}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Messages Sent"
          value={stats?.totalMessagesSent ?? 0}
          icon={Mail}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          change={`${stats?.conversionRate ?? 0}% conversion`}
          changeType={stats?.conversionRate > 0 ? 'up' : null}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status */}
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 hover:shadow-md hover:shadow-zinc-200/50 transition-all">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-zinc-900">Leads by Status</h3>
          </div>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData} barSize={36} radius={[8, 8, 0, 0]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Leads" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-sm text-zinc-400">
              No lead data yet. Import leads to see the chart.
            </div>
          )}
        </div>

        {/* Messages Last 7 Days */}
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 hover:shadow-md hover:shadow-zinc-200/50 transition-all">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-semibold text-zinc-900">Messages (Last 7 Days)</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={messageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#71717a' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="messages"
                name="Messages"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#4f46e5' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Leads */}
      {stats?.recentLeads?.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200/60 p-6 hover:shadow-md hover:shadow-zinc-200/50 transition-all">
          <h3 className="text-base font-semibold text-zinc-900 mb-4">Recent Leads</h3>
          <div className="divide-y divide-zinc-100">
            {stats.recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {lead.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{lead.name}</p>
                    <p className="text-xs text-zinc-500">{lead.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{lead.company || '—'}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    { new: 'bg-indigo-50 text-indigo-600', contacted: 'bg-amber-50 text-amber-600', replied: 'bg-green-50 text-green-600', converted: 'bg-emerald-50 text-emerald-600' }[lead.status] || 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
