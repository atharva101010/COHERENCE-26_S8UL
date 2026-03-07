import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Search, RefreshCw, Globe, Building2, Mail, User, CheckCircle } from 'lucide-react';
import { safeJsonParse } from '../lib/utils';

const API = import.meta.env.VITE_API_URL || '';

export default function LeadEnrichment() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [search, setSearch] = useState('');

  const [totalLeads, setTotalLeads] = useState(0);

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/api/leads?limit=10000`);
      const list = Array.isArray(data) ? data : data.leads || [];
      setLeads(list);
      setTotalLeads(data.total ?? list.length);
    } catch { toast.error('Failed to load leads'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const enrichAll = async () => {
    setEnriching(true);
    try {
      const { data } = await axios.post(`${API}/api/features/enrich-bulk`);
      toast.success(`Enriched ${data.enriched} leads`);
      load();
    } catch { toast.error('Enrichment failed'); }
    setEnriching(false);
  };

  const enrichOne = async (id) => {
    try {
      const { data } = await axios.post(`${API}/api/features/enrich/${id}`);
      toast.success(`Enriched — ${data.enrichment.data_completeness}% complete`);
      load();
    } catch { toast.error('Enrichment failed'); }
  };

  const getEnrichment = (lead) => {
    const cf = typeof lead.custom_fields === 'string' ? safeJsonParse(lead.custom_fields, {}) : (lead.custom_fields || {});
    return cf.enrichment || null;
  };

  const filtered = leads.filter(l => l.name?.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase()));
  const enrichedCount = leads.filter(l => getEnrichment(l)).length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Search className="text-primary" /> Lead Enrichment</h1>
          <p className="text-sm text-muted-foreground mt-1">Enrich lead data with additional insights</p>
        </div>
        <button onClick={enrichAll} disabled={enriching} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={enriching ? 'animate-spin' : ''} /> {enriching ? 'Enriching...' : 'Enrich All Leads'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-bold mt-1">{totalLeads}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Enriched</p>
          <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{enrichedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Not Enriched</p>
          <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{totalLeads - enrichedCount}</p>
        </div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="w-full max-w-xs px-3 py-2 text-sm border border-border rounded-lg bg-background" />

      {/* Leads Grid */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />)}</div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">No leads found.</div>
      )}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(lead => {
            const enr = getEnrichment(lead);
            return (
              <div key={lead.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><User size={16} className="text-primary" /></div>
                    <div>
                      <p className="text-sm font-semibold">{lead.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </div>
                  </div>
                  {enr ? (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium"><CheckCircle size={10} /> Enriched</span>
                  ) : (
                    <button onClick={() => enrichOne(lead.id)} className="px-2.5 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20">Enrich</button>
                  )}
                </div>

                {enr && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Mail size={10} /> {enr.email_provider}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Globe size={10} /> {enr.email_domain}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Building2 size={10} /> {enr.account_type}</div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span>Completeness:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${enr.data_completeness}%` }} />
                        </div>
                        <span className="font-medium">{enr.data_completeness}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 text-[10px] text-muted-foreground border-t border-border pt-2">
                  <span className="capitalize">{lead.status}</span>
                  {lead.company && <span>{lead.company}</span>}
                  {lead.title && <span>{lead.title}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
