import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { UsersRound, Plus, Shield, Mail, X, Trash2, Clock, Loader2, Sparkles, AlertCircle, RefreshCw, UserPlus } from 'lucide-react';
import {
  fetchTeamMembers,
  inviteTeamMember,
  updateTeamMember,
  removeTeamMember,
  fetchTeamActivity,
  chatWithAI,
} from '../lib/supabaseService';

const ROLES = ['Admin', 'Manager', 'Member', 'Viewer'];
const STATUS_DOT_COLORS = { online: 'bg-green-500', invited: 'bg-yellow-500', offline: 'bg-zinc-300' };
const ROLE_BADGE_COLORS = {
  Admin: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  Manager: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  Member: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
  Viewer: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
};

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-zinc-200 rounded w-1/3" />
          <div className="h-2 bg-zinc-200 rounded w-1/2" />
        </div>
        <div className="h-6 bg-zinc-200 rounded w-16" />
      </div>
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="h-2 bg-zinc-200 rounded w-20 mb-3" />
      <div className="h-6 bg-zinc-200 rounded w-10" />
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="border border-red-300 bg-red-50 dark:bg-red-900/30 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
        <AlertCircle size={16} />
        <span>{message}</span>
      </div>
      <button onClick={onRetry} className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1">
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TeamCollaboration() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'Member' });
  const [inviting, setInviting] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTeamMembers();
      setMembers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError(null);
    try {
      const data = await fetchTeamActivity();
      setActivity(data);
    } catch (err) {
      setActivityError(err.message);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
    loadActivity();
  }, [loadTeam, loadActivity]);

  const handleInvite = async () => {
    const name = inviteForm.name.trim();
    const email = inviteForm.email.trim();
    if (!name) return toast.error('Name is required');
    if (!email) return toast.error('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email address');

    setInviting(true);
    try {
      const data = await inviteTeamMember({ name, email, role: inviteForm.role });
      setMembers(prev => [data, ...prev]);
      setShowInvite(false);
      setInviteForm({ name: '', email: '', role: 'Member' });
      toast.success(`${name} invited successfully`);
      loadActivity();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (id, newRole) => {
    const member = members.find(m => m.id === id);
    if (!member) return;
    const oldRole = member.role;
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m));
    try {
      await updateTeamMember(id, { role: newRole });
      toast.success(`${member.name}'s role updated to ${newRole}`);
      loadActivity();
    } catch (err) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, role: oldRole } : m));
      toast.error(err.message);
    }
  };

  const handleRemove = async (id) => {
    const member = members.find(m => m.id === id);
    if (!member) return;
    try {
      await removeTeamMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
      toast.success(`${member.name} removed from team`);
      loadActivity();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAIInsight = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const roleBreakdown = ROLES.map(r => {
        const count = members.filter(m => m.role === r).length;
        return count > 0 ? `${count} ${r}${count > 1 ? 's' : ''}` : null;
      }).filter(Boolean).join(', ');
      const data = await chatWithAI({
        message: `My outreach automation team has ${members.length} member${members.length !== 1 ? 's' : ''} (${roleBreakdown}). Give a 2-sentence actionable tip on optimizing this team structure for an outreach automation platform.`,
        context: 'Team collaboration optimization',
      });
      setAiInsight(data.reply);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const onlineCount = members.filter(m => m.status === 'online').length;
  const invitedCount = members.filter(m => m.status === 'invited').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UsersRound className="text-primary" /> Team Collaboration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your team and collaborate on outreach</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadTeam(); loadActivity(); }} className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-accent flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowInvite(true)} className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1.5">
            <Plus size={14} /> Invite Member
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && <ErrorBanner message={error} onRetry={loadTeam} />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Team Size</p>
              <p className="text-2xl font-bold mt-1">{members.length.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Active Now</p>
              <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{onlineCount.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Pending Invites</p>
              <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{invitedCount.toLocaleString()}</p>
            </div>
          </>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div role="dialog" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !inviting && setShowInvite(false)} onKeyDown={e => e.key === 'Escape' && !inviting && setShowInvite(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2"><UserPlus size={18} className="text-primary" /> Invite Team Member</h2>
              <button onClick={() => !inviting && setShowInvite(false)} disabled={inviting}><X size={18} /></button>
            </div>
            <div>
              <label htmlFor="invite-name" className="text-xs font-medium text-muted-foreground">Full Name</label>
              <input id="invite-name" value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Jane Smith" className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={inviting} />
            </div>
            <div>
              <label htmlFor="invite-email" className="text-xs font-medium text-muted-foreground">Email Address</label>
              <input id="invite-email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="jane@company.com" type="email" className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={inviting} />
            </div>
            <div>
              <label htmlFor="invite-role" className="text-xs font-medium text-muted-foreground">Role</label>
              <select id="invite-role" value={inviteForm.role} onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })} className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background" disabled={inviting}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <button onClick={handleInvite} disabled={inviting} className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {inviting ? <><Loader2 size={14} className="animate-spin" /> Sending Invite...</> : 'Send Invite'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold">Team Members</h3>
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : !error && members.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <UsersRound size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">No team members yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Invite your first team member to start collaborating</p>
              <button onClick={() => setShowInvite(true)} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 inline-flex items-center gap-1.5">
                <Plus size={14} /> Invite Member
              </button>
            </div>
          ) : (
            members.map(member => (
              <div key={member.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">{member.avatar}</div>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${STATUS_DOT_COLORS[member.status] || 'bg-zinc-300'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{member.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail size={10} /> {member.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{member.last_active}</span>
                  <select
                    value={member.role}
                    onChange={e => handleUpdateRole(member.id, e.target.value)}
                    className="px-2 py-1 text-xs border border-border rounded bg-background"
                    disabled={member.role === 'Admin' && members.filter(m => m.role === 'Admin').length <= 1}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 ${ROLE_BADGE_COLORS[member.role] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                    <Shield size={8} /> {member.role}
                  </span>
                  {member.role !== 'Admin' && (
                    <button onClick={() => handleRemove(member.id)} className="p-1 rounded hover:bg-red-50 dark:bg-red-900/30 text-red-500" title="Remove member">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Activity Feed */}
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          {activityError && <ErrorBanner message={activityError} onRetry={loadActivity} />}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            {activityLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-200" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2 bg-zinc-200 rounded w-3/4" />
                      <div className="h-2 bg-zinc-200 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !activityError && activity.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No activity recorded yet. Invite a member to get started.</p>
            ) : (
              activity.map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Clock size={10} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs"><span className="font-semibold">{item.user_name}</span> {item.action}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(item.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Permissions */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold">Role Permissions</h4>
            <div className="space-y-2 text-[10px] text-muted-foreground">
              <p><span className="font-bold text-red-600 dark:text-red-400">Admin</span>: Full access, manage team, delete data</p>
              <p><span className="font-bold text-blue-600 dark:text-blue-400">Manager</span>: Create workflows, manage leads, view analytics</p>
              <p><span className="font-bold text-foreground">Member</span>: Create & run workflows, view leads</p>
              <p><span className="font-bold text-zinc-500 dark:text-zinc-400">Viewer</span>: Read-only access to all data</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Team Insight */}
      <div className="bg-violet-50 dark:bg-violet-900/30 border border-violet-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-violet-700 dark:text-violet-300"><Sparkles size={14} /> AI Team Insight</h3>
          <button onClick={handleAIInsight} disabled={aiLoading || loading} className="px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1">
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Get Insight
          </button>
        </div>
        {aiError ? (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle size={12} />
            <span>{aiError}</span>
            <button onClick={handleAIInsight} className="underline ml-1">Retry</button>
          </div>
        ) : (
          <p className="text-xs text-violet-600 dark:text-violet-400">{aiInsight || 'Click "Get Insight" for AI-powered advice on optimizing your team structure.'}</p>
        )}
      </div>
    </div>
  );
}
