import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Activity, MessageSquare, Workflow, Calendar, Link as LinkIcon, Flag, LayoutGrid, Search, Filter, RefreshCw, X, Plus, Copy, Check, Download, Target, MailCheck, FileText, FlaskConical, Webhook, Users } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { fetchStatsOverview, fetchLeads, bulkImportLeads, fetchLeadMessageCounts } from '../lib/supabaseService';
import toast from 'react-hot-toast';

function getTimelineDotColor(status) {
  if (status === 'converted') return 'bg-emerald-500';
  if (status === 'contacted' || status === 'replied') return 'bg-primary';
  return 'bg-muted-foreground/30';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('board');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', email: '', company: '', title: '' });
  const [creating, setCreating] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [messageCounts, setMessageCounts] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [statsData, leadsData] = await Promise.all([
        fetchStatsOverview(),
        fetchLeads({ limit: 50 })
      ]);
      setStats(statsData);
      setLeads(leadsData.leads);
      setLastUpdated(new Date());
      const leadIds = (leadsData.leads || []).map(l => l.id);
      if (leadIds.length > 0) {
        try {
          const counts = await fetchLeadMessageCounts(leadIds);
          setMessageCounts(counts);
        } catch { /* non-critical */ }
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      toast.error(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search filtering
  const filteredLeads = useMemo(() => {
    let result = leads;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      const statusMap = { backlog: ['new'], active: ['contacted', 'replied'], review: ['bounced', 'unsubscribed'], converted: ['converted'] };
      result = result.filter(l => (statusMap[statusFilter] || []).includes(l.status));
    }
    return result;
  }, [leads, searchQuery, statusFilter]);

  const handleCreateLead = async () => {
    if (!newLead.name || !newLead.email) { toast.error('Name and email are required'); return; }
    setCreating(true);
    try {
      await bulkImportLeads([{ ...newLead, status: 'new' }]);
      toast.success('Lead created successfully');
      setShowCreateModal(false);
      setNewLead({ name: '', email: '', company: '', title: '' });
      fetchData();
    } catch { toast.error('Failed to create lead'); }
    finally { setCreating(false); }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(globalThis.location.href);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const exportSpreadsheet = () => {
    const headers = ['ID', 'Name', 'Email', 'Company', 'Status', 'Title', 'Created'];
    const rows = filteredLeads.map(l => [
      `FR-${l.id}`, l.name, l.email, l.company || '', l.status, l.title || '',
      l.created_at ? new Date(l.created_at).toLocaleDateString() : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `flowreach-leads-${new Date().toISOString().slice(0,10)}.csv` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLeads.length} leads`);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background min-h-screen">
        <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-card">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-8 w-20 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="p-8 max-w-[1600px] mx-auto w-full flex-1">
          <div className="mb-8">
            <div className="h-7 w-44 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-80 bg-muted/70 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-8">
            <div className="col-span-1 md:col-span-3 border border-border bg-card rounded-xl p-5 shadow-sm animate-pulse">
              <div className="h-4 w-24 bg-muted rounded mb-6" />
              <div className="flex justify-between"><div><div className="h-8 w-10 bg-muted rounded mb-1" /><div className="h-3 w-14 bg-muted/70 rounded" /></div><div><div className="h-8 w-10 bg-muted rounded mb-1" /><div className="h-3 w-14 bg-muted/70 rounded" /></div><div><div className="h-8 w-10 bg-muted rounded mb-1" /><div className="h-3 w-14 bg-muted/70 rounded" /></div></div>
              <div className="mt-6 h-10 bg-muted rounded-md" />
            </div>
            <div className="col-span-1 md:col-span-3 grid grid-rows-2 gap-5">
              <div className="border border-border bg-card rounded-xl p-4 shadow-sm animate-pulse"><div className="h-3 w-24 bg-muted rounded mb-4" /><div className="h-7 w-12 bg-muted rounded" /></div>
              <div className="border border-border bg-card rounded-xl p-4 shadow-sm animate-pulse"><div className="h-3 w-24 bg-muted rounded mb-4" /><div className="h-7 w-12 bg-muted rounded" /></div>
            </div>
            <div className="col-span-1 md:col-span-6 border border-border bg-card rounded-xl p-5 shadow-sm animate-pulse">
              <div className="h-4 w-32 bg-muted rounded mb-6" />
              <div className="h-36 w-full bg-muted/50 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
                {[1, 2].map(j => (
                  <div key={j} className="bg-card rounded-xl p-4 border border-border animate-pulse">
                    <div className="h-3 w-14 bg-muted rounded mb-3" />
                    <div className="h-5 w-28 bg-muted rounded mb-2" />
                    <div className="h-3 w-20 bg-muted/70 rounded" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Formatting Data for Charts
  const messagesData = (stats?.messagesLast7Days || []).map((m) => ({ name: m.date, value: m.count }));
  const statusCounts = stats?.leadsByStatus?.reduce((acc, curr) => ({ ...acc, [curr.status]: curr.count }), {}) || {};
  const executionsData = stats?.executionsByStatus || [];

  const msgTrendValue = (() => {
    const vals = messagesData.map(m => m.value);
    if (vals.length < 4) return 0;
    const mid = Math.ceil(vals.length / 2);
    const recent = vals.slice(mid).reduce((a, b) => a + b, 0);
    const older = vals.slice(0, mid).reduce((a, b) => a + b, 0);
    if (older === 0) return recent > 0 ? 100 : 0;
    return Number(((recent - older) / older * 100).toFixed(1));
  })();

  const execSuccessRate = stats?.totalExecutions > 0
    ? Number(((executionsData.find(e => e.status === 'completed')?.count || 0) / stats.totalExecutions * 100).toFixed(1))
    : 0;

  // Pipeline growth: derive from messagesLast7Days + lead status counts
  const pipelineData = (stats?.messagesLast7Days || []).map((m) => {
    const day = new Date(m.date);
    const label = day.toLocaleDateString('en-US', { weekday: 'short' });
    return { name: label, active: (statusCounts.new || 0) + (statusCounts.contacted || 0) + m.count, converted: (statusCounts.converted || 0) + m.count };
  });

  // Categorize leads for Kanban
  const backlog = filteredLeads.filter(l => ['new'].includes(l.status));
  const inProgress = filteredLeads.filter(l => ['contacted', 'replied'].includes(l.status));
  const validation = filteredLeads.filter(l => ['bounced', 'unsubscribed'].includes(l.status));
  const done = filteredLeads.filter(l => ['converted'].includes(l.status));

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/50 border-none" onClick={() => setShowCreateModal(false)} aria-label="Close modal" />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md p-6 pointer-events-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Create New Lead</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground"><X size={18}/></button>
            </div>
            <div className="space-y-3">
              <div><label htmlFor="new-lead-name" className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label><input id="new-lead-name" value={newLead.name} onChange={e => setNewLead(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" placeholder="John Doe" /></div>
              <div><label htmlFor="new-lead-email" className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label><input id="new-lead-email" value={newLead.email} onChange={e => setNewLead(p => ({...p, email: e.target.value}))} type="email" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" placeholder="john@example.com" /></div>
              <div><label htmlFor="new-lead-company" className="text-xs font-medium text-muted-foreground mb-1 block">Company</label><input id="new-lead-company" value={newLead.company} onChange={e => setNewLead(p => ({...p, company: e.target.value}))} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Acme Inc" /></div>
              <div><label htmlFor="new-lead-title" className="text-xs font-medium text-muted-foreground mb-1 block">Title</label><input id="new-lead-title" value={newLead.title} onChange={e => setNewLead(p => ({...p, title: e.target.value}))} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Marketing Manager" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button size="sm" disabled={creating} onClick={handleCreateLead} className="bg-primary text-primary-foreground">{creating ? 'Creating...' : 'Create Lead'}</Button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mx-8 mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
            <X size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setLoading(true); fetchData(); }} className="text-red-700 dark:text-red-300 hover:bg-red-100 dark:bg-red-900/40 gap-1.5">
            <RefreshCw size={14} /> Retry
          </Button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-card">
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
           <span>Reports</span>
           <span className="text-muted-foreground/50">/</span>
           <span className="text-foreground font-semibold bg-muted px-2 py-1 rounded-md">Leads overview</span>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
             <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search leads..." className="pl-8 pr-4 py-1.5 text-sm rounded-lg border border-border bg-muted/50 w-48 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder-muted-foreground" />
             {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12}/></button>}
           </div>
           {lastUpdated && (
             <span className="text-xs text-muted-foreground">
               Updated {lastUpdated.toLocaleTimeString()}
             </span>
           )}
           <Button variant="ghost" size="sm" className="text-muted-foreground gap-2 font-medium hover:text-foreground" onClick={fetchData}>
             <RefreshCw size={14} /> Refresh
           </Button>
           <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground gap-2 font-medium hover:text-foreground" onClick={handleShare}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied!' : 'Share'}</Button>
           <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" onClick={() => setShowCreateModal(true)}><Plus size={14} className="mr-1"/> Create lead</Button>
        </div>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto w-full flex-1">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Leads report</h1>
          <p className="text-[13px] text-muted-foreground max-w-2xl">
            Stay on top of your outreach, monitor conversions, and track status. Streamline your workflow and transform how you deliver results.
          </p>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-8">
          
          {/* Status Breakdown (Left Card) */}
          <div className="col-span-1 md:col-span-3 border border-border bg-card rounded-xl p-5 shadow-sm">
             <div className="flex items-center justify-between mb-4 text-muted-foreground">
                <span className="flex items-center gap-2 text-sm font-semibold"><Activity size={16}/> Lead status</span>
             </div>
             
             <div className="flex justify-between mt-2">
                <div>
                   <div className="text-2xl font-bold text-foreground">{backlog.length}</div>
                   <div className="text-[12px] font-medium text-muted-foreground flex items-center gap-1 mt-1">Backlog <span className="w-2 h-2 rounded bg-primary/70 ml-1"></span></div>
                </div>
                <div>
                   <div className="text-2xl font-bold text-foreground">{inProgress.length}</div>
                   <div className="text-[12px] font-medium text-muted-foreground flex items-center gap-1 mt-1">Active <span className="w-2 h-2 rounded bg-primary/40 ml-1"></span></div>
                </div>
                <div>
                   <div className="text-2xl font-bold text-foreground">{done.length}</div>
                   <div className="text-[12px] font-medium text-muted-foreground flex items-center gap-1 mt-1">Converted <span className="w-2 h-2 rounded bg-primary/20 ml-1"></span></div>
                </div>
             </div>
             
             <div className="mt-6 flex h-10 rounded-md overflow-hidden gap-0.5">
                <div className="bg-primary/70 h-full transition-all" style={{width: `${Math.max(10, (backlog.length/leads.length)*100 || 33)}%`}}></div>
                <div className="bg-primary/40 h-full transition-all" style={{width: `${Math.max(10, (inProgress.length/leads.length)*100 || 33)}%`}}></div>
                <div className="bg-primary/20 h-full transition-all" style={{width: `${Math.max(10, (done.length/leads.length)*100 || 33)}%`}}></div>
             </div>
             <div className="flex justify-between items-center mt-2 text-[11px] text-muted-foreground/70 font-medium">
               <span>1d</span>
               <span>7d</span>
             </div>
          </div>

          {/* Messages & Actions (Middle Cards stacked) */}
          <div className="col-span-1 md:col-span-3 grid grid-rows-2 gap-5 h-full">
            <div className="border border-border bg-card rounded-xl p-4 shadow-sm h-full flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2 text-xs font-semibold"><MessageSquare size={14}/> Messages sent</span>
              </div>
              <div className="flex justify-between items-end mt-2">
                 <div>
                    <div className="text-2xl font-bold text-foreground">{(stats?.totalMessagesSent || 0).toLocaleString()}</div>
                    <div className={`text-[10px] font-medium mt-1 flex items-center gap-1 ${msgTrendValue >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{msgTrendValue >= 0 ? '↗' : '↘'} {Math.abs(msgTrendValue)}% <span className="text-muted-foreground/60">(7d)</span></div>
                 </div>
                 <div className="w-24 h-12">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={messagesData}>
                        <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={{r:0}} />
                      </LineChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            </div>
            
            <div className="border border-border bg-card rounded-xl p-4 shadow-sm h-full flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-2 text-xs font-semibold"><Workflow size={14}/> Executions</span>
              </div>
              <div className="flex justify-between items-end mt-2">
                 <div>
                    <div className="text-2xl font-bold text-foreground">{(stats?.totalExecutions || 0).toLocaleString()}</div>
                    <div className="text-[10px] font-medium text-emerald-500 mt-1 flex items-center gap-1">✓ {execSuccessRate}% success <span className="text-muted-foreground/60">rate</span></div>
                 </div>
                 <div className="w-24 h-10 flex items-end gap-1">
                    {executionsData.map((e) => (
                      <div key={e.status} className="w-full bg-primary/50 hover:bg-primary transition-colors rounded-t-sm" style={{height: `${Math.max(20, (e.count/stats?.totalExecutions)*100 || 0)}%`}}></div>
                    ))}
                 </div>
              </div>
            </div>
          </div>

          {/* Growth Chart (Right Card) */}
          <div className="col-span-1 md:col-span-6 border border-border bg-card rounded-xl p-5 shadow-sm">
             <div className="flex items-center justify-between mb-4 text-muted-foreground">
                <span className="flex items-center gap-2 text-sm font-semibold"><Flag size={16}/> Pipeline growth</span>
             </div>
             <div className="h-40 w-full mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pipelineData.length > 0 ? pipelineData : [{name:'N/A', active:0, converted:0}]}>
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'var(--muted-foreground)'}} width={30}/>
                    <Tooltip cursor={{stroke: 'var(--border)'}} contentStyle={{borderRadius: '8px', border:'1px solid var(--border)', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Area type="monotone" dataKey="active" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="converted" stroke="var(--ring)" fill="var(--ring)" fillOpacity={0.05} strokeWidth={2} />
                  </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Quick Access Features */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-wide uppercase">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Lead Scoring', icon: Target, path: '/lead-scoring', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30 dark:bg-red-950/30' },
              { label: 'Email Tracking', icon: MailCheck, path: '/email-tracking', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/30 dark:bg-indigo-950/30' },
              { label: 'Templates', icon: FileText, path: '/templates', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30 dark:bg-emerald-950/30' },
              { label: 'A/B Testing', icon: FlaskConical, path: '/ab-testing', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/30 dark:bg-purple-950/30' },
              { label: 'Webhooks', icon: Webhook, path: '/webhooks', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30 dark:bg-amber-950/30' },
              { label: 'Team', icon: Users, path: '/team', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30 dark:bg-blue-950/30' },
            ].map(item => (
              <button key={item.label} onClick={() => navigate(item.path)} className={`${item.bg} border border-border rounded-xl p-3 flex items-center gap-2.5 hover:shadow-md transition-all text-left group`}>
                <item.icon size={18} className={`${item.color} group-hover:scale-110 transition-transform`} />
                <span className="text-xs font-semibold text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Insights Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Target size={14} className="text-red-500" /> Scoring Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Leads</span>
                <span className="font-bold text-foreground">{leads.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{leads.length > 0 ? ((done.length / leads.length) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Active Pipeline</span>
                <span className="font-bold text-primary">{inProgress.length} leads</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Needs Attention</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{validation.length} leads</span>
              </div>
            </div>
          </div>

          <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><MailCheck size={14} className="text-indigo-500" /> Outreach Activity</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Messages Sent</span>
                <span className="font-bold text-foreground">{stats?.totalMessagesSent || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Workflows Run</span>
                <span className="font-bold text-foreground">{stats?.totalExecutions || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Active Workflows</span>
                <span className="font-bold text-foreground">{stats?.activeWorkflows || 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Avg Messages/Day</span>
                <span className="font-bold text-foreground">{messagesData.length > 0 ? Math.round(messagesData.reduce((s, d) => s + d.value, 0) / messagesData.length) : 0}</span>
              </div>
            </div>
          </div>

          <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Workflow size={14} className="text-emerald-500" /> Pipeline Health</h3>
            <div className="space-y-3">
              {[
                { label: 'New / Backlog', count: backlog.length, total: leads.length, color: 'bg-primary/70' },
                { label: 'Active / In Progress', count: inProgress.length, total: leads.length, color: 'bg-primary' },
                { label: 'Converted / Won', count: done.length, total: leads.length, color: 'bg-emerald-500' },
                { label: 'Bounced / Review', count: validation.length, total: leads.length, color: 'bg-amber-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-bold text-foreground">{item.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Board Header & Filters */}
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-6 border-b border-border flex-1">
              {[{id:'board',label:'Board'},{id:'spreadsheet',label:'Spreadsheet'},{id:'calendar',label:'Calendar'},{id:'timeline',label:'Timeline'}].map(tab => (
                <button key={tab.id} onClick={() => setViewMode(tab.id)} className={`px-1 text-sm font-medium pb-2 cursor-pointer transition-colors ${viewMode === tab.id ? 'font-semibold text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>{tab.label}</button>
              ))}
           </div>
           <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground pl-4 border-b border-border pb-2 flex-shrink-0">
             <button onClick={() => setViewMode(viewMode === 'board' ? 'spreadsheet' : 'board')} className="flex items-center gap-2 hover:text-foreground transition-colors"><LayoutGrid size={16}/> Layout</button>
             <div className="relative">
               <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none bg-transparent text-sm cursor-pointer hover:text-foreground transition-colors pr-4">
                 <option value="all">All Status</option>
                 <option value="backlog">Backlog</option>
                 <option value="active">Active</option>
                 <option value="review">Needs Review</option>
                 <option value="converted">Converted</option>
               </select>
               <Filter size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none"/>
             </div>
           </div>
        </div>

        {/* Spreadsheet View */}
        {viewMode === 'spreadsheet' && (
          <div className="mb-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={exportSpreadsheet} className="gap-2 text-xs"><Download size={14}/> Export CSV</Button>
          </div>
        )}
        {viewMode === 'spreadsheet' && (
          <div className="border border-border rounded-xl overflow-hidden mb-10">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-3 font-semibold text-muted-foreground">ID</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Name</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Email</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Company</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Created</th>
              </tr></thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id} onClick={() => navigate('/leads')} className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors">
                    <td className="p-3 text-muted-foreground font-mono text-xs">FR-{lead.id}</td>
                    <td className="p-3 font-medium text-foreground">{lead.name}</td>
                    <td className="p-3 text-muted-foreground">{lead.email}</td>
                    <td className="p-3 text-muted-foreground">{lead.company || '—'}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs capitalize">{lead.status}</Badge></td>
                    <td className="p-3 text-muted-foreground text-xs">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No leads found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="border border-border rounded-xl p-8 mb-10 bg-card">
            <div className="grid grid-cols-7 gap-2 mb-4">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({length: 30}, (_, i) => {
                const dayLeads = filteredLeads.filter(l => l.created_at && new Date(l.created_at).getDate() === (i+1));
                return (
                  <div key={i} className={`border border-border rounded-lg p-2 min-h-[80px] ${dayLeads.length > 0 ? 'bg-primary/5' : 'bg-background'}`}>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">{i+1}</div>
                    {dayLeads.slice(0,2).map(l => <div key={l.id} className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5 mb-0.5 truncate font-medium">{l.name}</div>)}
                    {dayLeads.length > 2 && <div className="text-[10px] text-muted-foreground font-medium">+{dayLeads.length - 2} more</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="border border-border rounded-xl p-6 mb-10 bg-card">
            <div className="space-y-4">
              {filteredLeads.slice(0, 20).map((lead, i) => (
                <div key={lead.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${getTimelineDotColor(lead.status)}`}/>
                    {i < Math.min(filteredLeads.length, 20) - 1 && <div className="w-0.5 h-8 bg-border"/>}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{lead.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">{lead.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{lead.company || 'No company'} · {lead.email}</div>
                    <div className="text-[11px] text-muted-foreground/60 mt-0.5">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''}</div>
                  </div>
                </div>
              ))}
              {filteredLeads.length === 0 && <div className="text-center text-muted-foreground py-8">No leads to display</div>}
            </div>
          </div>
        )}

        {/* Kanban Board (Board view) */}
        {viewMode === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start pb-10">
           
           {/* Column 1: Backlog */}
           <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between pb-2 text-foreground mb-1 border-b border-border border-dashed">
                <div className="flex items-center gap-2 font-semibold text-[13px]"><LayoutGrid size={16} className="text-muted-foreground"/> Backlog <span className="ml-2 bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-bold">{backlog.length}</span></div>
             </div>
             {backlog.length === 0 && <div className="text-xs text-muted-foreground py-6 px-4 border rounded-xl border-dashed border-border bg-muted/30 text-center font-medium">No new leads</div>}
             {backlog.map((lead) => (
                <button key={lead.id} type="button" onClick={() => setExpandedCardId(expandedCardId === lead.id ? null : lead.id)} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group text-left w-full">
                  <div className="flex items-center justify-between mb-3 text-[11px] font-semibold">
                    <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors"><LinkIcon size={12}/> FR-{lead.id}</span>
                    <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 uppercase tracking-widest text-[9px] hover:bg-emerald-500/20"><Flag size={10} className="mr-1 inline"/> New</Badge>
                  </div>
                  <h4 className="font-bold text-foreground text-[14px] leading-snug mb-1">{lead.company || lead.name}</h4>
                  <p className="text-[12px] text-muted-foreground font-medium mb-4 flex items-center gap-1.5"><Calendar size={12}/> Prospecting</p>
                  {expandedCardId === lead.id && (
                    <div className="mb-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                      <div><span className="font-semibold text-muted-foreground">Name:</span> <span className="text-foreground">{lead.name}</span></div>
                      <div><span className="font-semibold text-muted-foreground">Email:</span> <span className="text-foreground">{lead.email}</span></div>
                      <div><span className="font-semibold text-muted-foreground">Company:</span> <span className="text-foreground">{lead.company || '—'}</span></div>
                      <div><span className="font-semibold text-muted-foreground">Title:</span> <span className="text-foreground">{lead.title || '—'}</span></div>
                      <Button size="sm" variant="outline" className="mt-2 text-xs w-full" onClick={e => { e.stopPropagation(); navigate('/leads'); }}>View in Leads →</Button>
                    </div>
                  )}
                  <Separator className="mb-3" />
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Avatar className="w-6 h-6 border bg-muted"><AvatarFallback className="text-[9px] font-bold text-muted-foreground">{lead.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                     </div>
                     <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"><MessageSquare size={12}/> {messageCounts[lead.id] || 0}</span>
                  </div>
                </button>
             ))}
           </div>

           {/* Column 2: In Progress */}
           <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between pb-2 text-foreground mb-1 border-b border-primary/30 border-dashed">
                <div className="flex items-center gap-2 font-semibold text-[13px]"><Activity size={16} className="text-primary"/> Active <span className="ml-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">{inProgress.length}</span></div>
             </div>
             {inProgress.map((lead) => (
                <button key={lead.id} type="button" onClick={() => setExpandedCardId(expandedCardId === lead.id ? null : lead.id)} className="bg-card rounded-xl p-4 shadow-sm border border-primary/20 relative hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group text-left w-full">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50 rounded-t-xl opacity-80" />
                  <div className="flex items-center justify-between mb-3 mt-1 text-[11px] font-semibold">
                    <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors"><LinkIcon size={12}/> FR-{lead.id}</span>
                    <Badge variant="outline" className="text-primary bg-primary/10 border-primary/20 uppercase tracking-widest text-[9px] hover:bg-primary/20"><Activity size={10} className="mr-1 inline"/> Active</Badge>
                  </div>
                  <h4 className="font-bold text-foreground text-[14px] leading-snug mb-1">{lead.company || lead.name}</h4>
                  <p className="text-[12px] text-muted-foreground font-medium mb-4 flex items-center gap-1.5"><Workflow size={12}/> Multi-channel drip</p>
                  {expandedCardId === lead.id && (
                    <div className="mb-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                      <div><span className="font-semibold text-muted-foreground">Name:</span> <span className="text-foreground">{lead.name}</span></div>
                      <div><span className="font-semibold text-muted-foreground">Email:</span> <span className="text-foreground">{lead.email}</span></div>
                      <div><span className="font-semibold text-muted-foreground">Company:</span> <span className="text-foreground">{lead.company || '—'}</span></div>
                      <div><span className="font-semibold text-muted-foreground">Title:</span> <span className="text-foreground">{lead.title || '—'}</span></div>
                      <Button size="sm" variant="outline" className="mt-2 text-xs w-full" onClick={e => { e.stopPropagation(); navigate('/leads'); }}>View in Leads →</Button>
                    </div>
                  )}
                  <Separator className="mb-3" />
                  <div className="flex items-center justify-between">
                     <div className="flex items-center -space-x-1.5">
                       <Avatar className="w-6 h-6 border bg-muted ring-2 ring-card"><AvatarFallback className="text-[9px] font-bold">{lead.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                       <Avatar className="w-6 h-6 border bg-primary/10 ring-2 ring-card"><AvatarFallback className="text-primary text-[9px] font-bold">AI</AvatarFallback></Avatar>
                     </div>
                     <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"><MessageSquare size={12}/> {messageCounts[lead.id] || 0}</span>
                  </div>
                </button>
             ))}
           </div>

           {/* Column 3: Validation */}
           <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between pb-2 text-foreground mb-1 border-b border-amber-500/30 border-dashed">
                <div className="flex items-center gap-2 font-semibold text-[13px]"><AlertCircleIcon className="text-amber-500"/> Needs Review <span className="ml-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold">{validation.length}</span></div>
             </div>
             {validation.length === 0 && <div className="text-xs text-muted-foreground py-6 px-4 border rounded-xl border-dashed border-border bg-muted/30 text-center font-medium">No alerts today</div>}
             {validation.map((lead) => (
                <button key={lead.id} type="button" onClick={() => setExpandedCardId(expandedCardId === lead.id ? null : lead.id)} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:border-amber-500/30 hover:shadow-md transition-all cursor-pointer opacity-90 group text-left w-full">
                  <div className="flex items-center justify-between mb-3 text-[11px] font-semibold">
                    <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors"><LinkIcon size={12}/> FR-{lead.id}</span>
                    <Badge variant="outline" className="text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 uppercase tracking-widest text-[9px] hover:bg-amber-500/20"><Flag size={10} className="mr-1 inline"/> Review</Badge>
                  </div>
                  <h4 className="font-bold text-foreground text-[14px] leading-snug mb-1">{lead.company || lead.name}</h4>
                  <p className="text-[12px] text-muted-foreground font-medium flex items-center gap-1.5"><Activity size={12}/> {lead.status}</p>
                  {expandedCardId === lead.id && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                      <div><span className="font-semibold text-muted-foreground">Name:</span> <span className="text-foreground">{lead.name}</span></div>
                      <div><span className="font-semibold text-muted-foreground">Email:</span> <span className="text-foreground">{lead.email}</span></div>
                      <div><span className="font-semibold text-muted-foreground">Company:</span> <span className="text-foreground">{lead.company || '—'}</span></div>
                      <Button size="sm" variant="outline" className="mt-2 text-xs w-full" onClick={e => { e.stopPropagation(); navigate('/leads'); }}>View in Leads →</Button>
                    </div>
                  )}
                </button>
             ))}
           </div>

           {/* Column 4: Done */}
           <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between pb-2 text-foreground mb-1 border-b border-emerald-500/30 border-dashed">
                <div className="flex items-center gap-2 font-semibold text-[13px]"><CheckCircleIcon className="text-emerald-500"/> Converted <span className="ml-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">{done.length}</span></div>
             </div>
             {done.length === 0 && <div className="text-xs text-muted-foreground py-6 px-4 border rounded-xl border-dashed border-border bg-muted/30 text-center font-medium">No converted leads yet</div>}
             {done.map((lead) => (
                <button key={lead.id} type="button" onClick={() => setExpandedCardId(expandedCardId === lead.id ? null : lead.id)} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-all cursor-pointer border-l-4 border-l-emerald-500 group text-left w-full">
                  <div className="flex items-center justify-between mb-3 text-[11px] font-semibold">
                    <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors"><LinkIcon size={12}/> FR-{lead.id}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wide uppercase">Won</span>
                  </div>
                  <h4 className="font-bold text-foreground text-[14px] leading-snug mb-1">{lead.company || lead.name}</h4>
                  <p className="text-[12px] text-muted-foreground font-medium flex items-center gap-1.5"><Calendar size={12}/> Closed</p>
                  {expandedCardId === lead.id && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                      <div><span className="font-semibold text-muted-foreground">Name:</span> <span className="text-foreground">{lead.name}</span></div>
                      <div><span className="font-semibold text-muted-foreground">Email:</span> <span className="text-foreground">{lead.email}</span></div>
                      <div><span className="font-semibold text-muted-foreground">Company:</span> <span className="text-foreground">{lead.company || '—'}</span></div>
                      <Button size="sm" variant="outline" className="mt-2 text-xs w-full" onClick={e => { e.stopPropagation(); navigate('/leads'); }}>View in Leads →</Button>
                    </div>
                  )}
                </button>
             ))}
           </div>

        </div>
        )}
      </div>
    </div>
  );
}

function CheckCircleIcon(props) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
}
function AlertCircleIcon(props) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
}
