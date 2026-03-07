import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Target, RefreshCw, TrendingUp, Award, User, AlertCircle, Users } from 'lucide-react';
import { fetchLeadsForScoring, scoreLeadById, scoreAllLeads } from '../lib/supabaseService';
import { safeJsonParse } from '../lib/utils';

const tierColors = { hot: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300', warm: 'bg-orange-100 text-orange-700 dark:text-orange-300', cool: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300', cold: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' };
const tierLabels = { hot: 'Hot Lead', warm: 'Warm Lead', cool: 'Cool Lead', cold: 'Cold Lead' };

function getScoreBarColor(score) {
  if (score >= 80) return 'bg-red-500';
  if (score >= 50) return 'bg-orange-500';
  if (score >= 25) return 'bg-blue-500';
  return 'bg-zinc-400';
}

function getScore(lead) {
  const cf = typeof lead.custom_fields === 'string' ? safeJsonParse(lead.custom_fields, {}) : (lead.custom_fields || {});
  return { score: cf.lead_score ?? null, tier: cf.lead_tier ?? null };
}

function StatSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="h-3 w-20 bg-muted rounded mb-3" />
      <div className="h-7 w-14 bg-muted rounded" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="bg-muted/50 border-b border-border px-4 py-3">
        <div className="flex gap-8">
          {[80, 60, 50, 40, 40, 40].map((w) => (
            <div key={w} className="h-3 bg-muted rounded animate-pulse" style={{ width: w }} />
          ))}
        </div>
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-2.5 w-44 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
          <div className="h-7 w-14 bg-muted rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function LeadScoring() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [scoringId, setScoringId] = useState(null);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeadsForScoring();
      setLeads(data);
    } catch (err) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleScoreAll = async () => {
    setScoring(true);
    try {
      const result = await scoreAllLeads();
      toast.success(`Scored ${result.scored.toLocaleString()} leads`);
      await load();
    } catch (err) {
      toast.error(err.message || 'Bulk scoring failed');
    } finally {
      setScoring(false);
    }
  };

  const handleScoreOne = async (id) => {
    setScoringId(id);
    try {
      const result = await scoreLeadById(id);
      toast.success(`${result.tier?.charAt(0).toUpperCase()}${result.tier?.slice(1)} — Score: ${result.score}`);
      await load();
    } catch (err) {
      toast.error(err.message || 'Scoring failed');
    } finally {
      setScoringId(null);
    }
  };

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q);
    const { tier } = getScore(l);
    const matchTier = tierFilter === '' || tier === tierFilter;
    return matchSearch && matchTier;
  });

  const scoredLeads = leads.filter(l => getScore(l).score !== null);
  const avgScore = scoredLeads.length > 0 ? Math.round(scoredLeads.reduce((s, l) => s + (getScore(l).score || 0), 0) / scoredLeads.length) : 0;
  const hotCount = scoredLeads.filter(l => getScore(l).tier === 'hot').length;
  const warmCount = scoredLeads.filter(l => getScore(l).tier === 'warm').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Target className="text-primary" /> Lead Scoring</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered lead prioritization</p>
        </div>
        <button onClick={handleScoreAll} disabled={scoring || loading || leads.length === 0} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={14} className={scoring ? 'animate-spin' : ''} /> {scoring ? 'Scoring...' : 'Score All Leads'}
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <StatSkeleton key={i} />)}
        </div>
      ) : !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="text-2xl font-bold mt-1">{leads.length.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Average Score</p>
            <p className="text-2xl font-bold mt-1">{avgScore}<span className="text-sm text-muted-foreground">/100</span></p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Award size={12} className="text-red-500" /> Hot Leads</p>
            <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">{hotCount.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp size={12} className="text-orange-500" /> Warm Leads</p>
            <p className="text-2xl font-bold mt-1 text-orange-600 dark:text-orange-400">{warmCount.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
          <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Failed to load leads</p>
          <p className="text-xs text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={load} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
            Retry
          </button>
        </div>
      )}

      {/* Filters — only show when we have data */}
      {!loading && !error && leads.length > 0 && (
        <div className="flex gap-3 items-center">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." className="flex-1 max-w-xs px-3 py-2 text-sm border border-border rounded-lg bg-background" />
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="px-3 py-2 text-sm border border-border rounded-lg bg-background">
            <option value="">All Tiers</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cool">Cool</option>
            <option value="cold">Cold</option>
          </select>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && <TableSkeleton />}

      {/* Empty State */}
      {!loading && !error && leads.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Users className="mx-auto text-muted-foreground mb-3" size={40} />
          <p className="text-lg font-semibold text-foreground mb-1">No leads yet</p>
          <p className="text-sm text-muted-foreground mb-4">Import leads first, then come back to score and prioritize them.</p>
          <a href="/leads" className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            Go to Leads
          </a>
        </div>
      )}

      {/* No Results After Filter */}
      {!loading && !error && leads.length > 0 && filtered.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">No leads match your search or filter.</p>
        </div>
      )}

      {/* Leads Table */}
      {!loading && !error && filtered.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Score</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Tier</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const { score, tier } = getScore(lead);
                return (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><User size={14} className="text-primary" /></div>
                        <div>
                          <p className="text-sm font-medium">{lead.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{lead.company || '—'}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 text-[10px] font-medium bg-secondary rounded-full capitalize">{lead.status}</span></td>
                    <td className="px-4 py-3 text-center">
                      {score === null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${getScoreBarColor(score)}`} style={{ width: `${score}%` }} />
                          </div>
                          <span className="text-sm font-bold">{score}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {tier ? <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${tierColors[tier]}`}>{tierLabels[tier]}</span> : <span className="text-xs text-muted-foreground">Unscored</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleScoreOne(lead.id)} disabled={scoringId === lead.id} className="px-2.5 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 disabled:opacity-50">
                        {scoringId === lead.id ? <RefreshCw size={12} className="animate-spin" /> : 'Score'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
