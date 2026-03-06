import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Activity, MessageSquare, Workflow, Calendar, Link as LinkIcon, Flag, LayoutGrid, Search, Maximize2, MoreVertical, PenLine, Filter, RefreshCw } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ResponsiveContainer, YAxis, Tooltip, XAxis } from 'recharts';
import { fetchStatsOverview, fetchLeads } from '../lib/supabaseService';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, leadsData] = await Promise.all([
        fetchStatsOverview(),
        fetchLeads({ limit: 50 })
      ]);
      setStats(statsData);
      setLeads(leadsData.leads);
      setLastUpdated(new Date());
    } catch {
      // quiet fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-8 animate-pulse text-muted-foreground flex items-center justify-center h-full">Loading your workspace...</div>;
  }

  // Formatting Data for Charts
  const messagesData = (stats?.messagesLast7Days || []).map((m) => ({ name: m.date, value: m.count }));
  const statusCounts = stats?.leadsByStatus?.reduce((acc, curr) => ({ ...acc, [curr.status]: curr.count }), {}) || {};
  const executionsData = stats?.executionsByStatus || [];

  // Categorize leads for Kanban
  const backlog = leads.filter(l => ['new'].includes(l.status));
  const inProgress = leads.filter(l => ['contacted', 'replied'].includes(l.status));
  const validation = leads.filter(l => ['bounced', 'unsubscribed'].includes(l.status));
  const done = leads.filter(l => ['converted'].includes(l.status));

  return (
    <div className="flex flex-col h-full bg-background min-h-screen">
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
             <input type="text" placeholder="Search" className="pl-8 pr-4 py-1.5 text-sm rounded-lg border border-border bg-muted/50 w-48 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder-muted-foreground" />
             <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium px-1 border border-border rounded">⌘F</div>
           </div>
           {lastUpdated && (
             <span className="text-xs text-muted-foreground">
               Updated {lastUpdated.toLocaleTimeString()}
             </span>
           )}
           <Button variant="ghost" size="sm" className="text-muted-foreground gap-2 font-medium hover:text-foreground" onClick={fetchData}>
             <RefreshCw size={14} /> Refresh
           </Button>
           <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground gap-2 font-medium hover:text-foreground"><LinkIcon size={14}/> Share</Button>
           <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">Create lead</Button>
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
                <div className="flex items-center gap-1.5 opacity-60">
                   <PenLine size={14} className="hover:text-foreground cursor-pointer"/>
                   <Maximize2 size={14} className="hover:text-foreground cursor-pointer"/>
                   <MoreVertical size={14} className="hover:text-foreground cursor-pointer"/>
                </div>
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
                <div className="flex items-center gap-1 opacity-60">
                   <MoreVertical size={12} className="hover:text-foreground cursor-pointer"/>
                </div>
              </div>
              <div className="flex justify-between items-end mt-2">
                 <div>
                    <div className="text-2xl font-bold text-foreground">{stats?.totalMessagesSent || 0}</div>
                    <div className="text-[10px] font-medium text-emerald-500 mt-1 flex items-center gap-1">↗ 12.5% <span className="text-muted-foreground/60">(7d)</span></div>
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
                <div className="flex items-center gap-1 opacity-60">
                   <MoreVertical size={12} className="hover:text-foreground cursor-pointer"/>
                </div>
              </div>
              <div className="flex justify-between items-end mt-2">
                 <div>
                    <div className="text-2xl font-bold text-foreground">{stats?.totalExecutions || 0}</div>
                    <div className="text-[10px] font-medium text-emerald-500 mt-1 flex items-center gap-1">↗ 4.2% <span className="text-muted-foreground/60">(7d)</span></div>
                 </div>
                 <div className="w-24 h-10 flex items-end gap-1">
                    {executionsData.map((e,i) => (
                      <div key={i} className="w-full bg-primary/50 hover:bg-primary transition-colors rounded-t-sm" style={{height: `${Math.max(20, (e.count/stats?.totalExecutions)*100 || 0)}%`}}></div>
                    ))}
                 </div>
              </div>
            </div>
          </div>

          {/* Growth Chart (Right Card) */}
          <div className="col-span-1 md:col-span-6 border border-border bg-card rounded-xl p-5 shadow-sm">
             <div className="flex items-center justify-between mb-4 text-muted-foreground">
                <span className="flex items-center gap-2 text-sm font-semibold"><Flag size={16}/> Pipeline growth</span>
                <div className="flex items-center gap-1.5 opacity-60">
                   <PenLine size={14} className="hover:text-foreground cursor-pointer"/>
                   <Maximize2 size={14} className="hover:text-foreground cursor-pointer"/>
                   <MoreVertical size={14} className="hover:text-foreground cursor-pointer"/>
                </div>
             </div>
             <div className="h-40 w-full mt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    {name: 'Jan', active: 120, converted: 110}, {name: 'Feb', active: 118, converted: 110}, {name: 'Mar', active: 115, converted: 100},
                    {name: 'Apr', active: 80, converted: 90}, {name: 'May', active: 60, converted: 70}, {name: 'Jun', active: 40, converted: 60}, {name: 'Jul', active: 20, converted: 40}
                  ]}>
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: 'var(--muted-foreground)'}} width={30}/>
                    <Tooltip cursor={{stroke: 'var(--border)'}} contentStyle={{borderRadius: '8px', border:'1px solid var(--border)', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Area type="monotone" dataKey="active" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="converted" stroke="var(--ring)" fill="var(--ring)" fillOpacity={0.05} strokeWidth={2} />
                  </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Board Header & Filters */}
        <div className="flex items-center justify-between mb-6">
           <div className="flex items-center gap-6 border-b border-border flex-1">
              <span className="px-1 text-sm font-semibold text-foreground border-b-2 border-primary pb-2 cursor-pointer">Board</span>
              <span className="px-1 text-sm font-medium text-muted-foreground hover:text-foreground pb-2 cursor-pointer transition-colors">Spreadsheet</span>
              <span className="px-1 text-sm font-medium text-muted-foreground hover:text-foreground pb-2 cursor-pointer transition-colors">Calendar</span>
              <span className="px-1 text-sm font-medium text-muted-foreground hover:text-foreground pb-2 cursor-pointer transition-colors">Timeline</span>
           </div>
           <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground pl-4 border-b border-border pb-2 flex-shrink-0">
             <button className="flex items-center gap-2 hover:text-foreground transition-colors"><LayoutGrid size={16}/> Layout</button>
             <button className="flex items-center gap-2 hover:text-foreground transition-colors"><Filter size={16}/> Filter</button>
           </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start h-full pb-10">
           
           {/* Column 1: Backlog */}
           <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between pb-2 text-foreground mb-1 border-b border-border border-dashed">
                <div className="flex items-center gap-2 font-semibold text-[13px]"><LayoutGrid size={16} className="text-muted-foreground"/> Backlog <span className="ml-2 bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-bold">{backlog.length}</span></div>
                <MoreVertical size={14} className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"/>
             </div>
             {backlog.map((lead) => (
                <div key={lead.id} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-3 text-[11px] font-semibold">
                    <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors"><LinkIcon size={12}/> FR-{lead.id}</span>
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-500/10 border-emerald-500/20 uppercase tracking-widest text-[9px] hover:bg-emerald-500/20"><Flag size={10} className="mr-1 inline"/> New</Badge>
                  </div>
                  <h4 className="font-bold text-foreground text-[14px] leading-snug mb-1">{lead.company || lead.name}</h4>
                  <p className="text-[12px] text-muted-foreground font-medium mb-4 flex items-center gap-1.5"><Calendar size={12}/> Prospecting</p>
                  <Separator className="mb-3" />
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Avatar className="w-6 h-6 border bg-muted"><AvatarFallback className="text-[9px] font-bold text-muted-foreground">{lead.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                     </div>
                     <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"><MessageSquare size={12}/> 0</span>
                  </div>
                </div>
             ))}
           </div>

           {/* Column 2: In Progress */}
           <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between pb-2 text-foreground mb-1 border-b border-primary/30 border-dashed">
                <div className="flex items-center gap-2 font-semibold text-[13px]"><Activity size={16} className="text-primary"/> Active <span className="ml-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">{inProgress.length}</span></div>
                <MoreVertical size={14} className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"/>
             </div>
             {inProgress.map((lead) => (
                <div key={lead.id} className="bg-card rounded-xl p-4 shadow-sm border border-primary/20 relative z-10 transform sm:-translate-y-1 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50 rounded-t-xl opacity-80" />
                  <div className="flex items-center justify-between mb-3 mt-1 text-[11px] font-semibold">
                    <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors"><LinkIcon size={12}/> FR-{lead.id}</span>
                    <Badge variant="outline" className="text-primary bg-primary/10 border-primary/20 uppercase tracking-widest text-[9px] hover:bg-primary/20"><Activity size={10} className="mr-1 inline"/> Active</Badge>
                  </div>
                  <h4 className="font-bold text-foreground text-[14px] leading-snug mb-1">{lead.company || lead.name}</h4>
                  <p className="text-[12px] text-muted-foreground font-medium mb-4 flex items-center gap-1.5"><Workflow size={12}/> Multi-channel drip</p>
                  <Separator className="mb-3" />
                  <div className="flex items-center justify-between">
                     <div className="flex items-center -space-x-1.5">
                       <Avatar className="w-6 h-6 border bg-muted ring-2 ring-card"><AvatarFallback className="text-[9px] font-bold">{lead.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                       <Avatar className="w-6 h-6 border bg-primary/10 ring-2 ring-card"><AvatarFallback className="text-primary text-[9px] font-bold">AI</AvatarFallback></Avatar>
                     </div>
                     <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1"><MessageSquare size={12}/> {(lead.email.length % 5) + 1}</span>
                  </div>
                </div>
             ))}
           </div>

           {/* Column 3: Validation */}
           <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between pb-2 text-foreground mb-1 border-b border-amber-500/30 border-dashed">
                <div className="flex items-center gap-2 font-semibold text-[13px]"><AlertCircleIcon className="text-amber-500"/> Needs Review <span className="ml-2 bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{validation.length}</span></div>
                <MoreVertical size={14} className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"/>
             </div>
             {validation.length === 0 && <div className="text-xs text-muted-foreground py-6 px-4 border rounded-xl border-dashed border-border bg-muted/30 text-center font-medium">No alerts today</div>}
             {validation.map((lead) => (
                <div key={lead.id} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:border-amber-500/30 hover:shadow-md transition-all cursor-pointer opacity-90 group">
                  <div className="flex items-center justify-between mb-3 text-[11px] font-semibold">
                    <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors"><LinkIcon size={12}/> FR-{lead.id}</span>
                    <Badge variant="outline" className="text-amber-600 bg-amber-500/10 border-amber-500/20 uppercase tracking-widest text-[9px] hover:bg-amber-500/20"><Flag size={10} className="mr-1 inline"/> Review</Badge>
                  </div>
                  <h4 className="font-bold text-foreground text-[14px] leading-snug mb-1">{lead.company || lead.name}</h4>
                  <p className="text-[12px] text-muted-foreground font-medium flex items-center gap-1.5"><Activity size={12}/> {lead.status}</p>
                </div>
             ))}
           </div>

           {/* Column 4: Done */}
           <div className="flex flex-col gap-3">
             <div className="flex items-center justify-between pb-2 text-foreground mb-1 border-b border-emerald-500/30 border-dashed">
                <div className="flex items-center gap-2 font-semibold text-[13px]"><CheckCircleIcon className="text-emerald-500"/> Converted <span className="ml-2 bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{done.length}</span></div>
                <MoreVertical size={14} className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"/>
             </div>
             {done.map((lead) => (
                <div key={lead.id} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-all cursor-pointer border-l-4 border-l-emerald-500 group">
                  <div className="flex items-center justify-between mb-3 text-[11px] font-semibold">
                    <span className="text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors"><LinkIcon size={12}/> FR-{lead.id}</span>
                    <span className="text-emerald-600 text-[10px] font-bold tracking-wide uppercase">Won</span>
                  </div>
                  <h4 className="font-bold text-foreground text-[14px] leading-snug mb-1">{lead.company || lead.name}</h4>
                  <p className="text-[12px] text-muted-foreground font-medium flex items-center gap-1.5"><Calendar size={12}/> Closed</p>
                </div>
             ))}
           </div>

        </div>
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
