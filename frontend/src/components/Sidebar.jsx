import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Play,
  Settings,
  Zap,
  Sparkles
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/workflows', label: 'Workflows', icon: GitBranch },
  { to: '/executions', label: 'Executions', icon: Play },
  { to: '/ai', label: 'AI Assistant', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-[260px] bg-white/80 backdrop-blur-sm border-r border-zinc-200/60 min-h-screen flex flex-col">
      <div className="p-5 border-b border-zinc-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-violet-600 bg-clip-text text-transparent">
              FlowReach AI
            </span>
            <p className="text-[10px] text-zinc-400 -mt-0.5 tracking-wide uppercase">Lead Outreach Automation</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 mt-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200'
                  : 'text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-[18px] h-[18px] transition-colors ${
                  isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-600'
                }`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mx-3 mb-3 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-100/50">
        <p className="text-xs font-medium text-indigo-700">FlowReach AI v1.0</p>
        <p className="text-[10px] text-indigo-500/70 mt-0.5">Powered by Groq LLM</p>
      </div>
    </aside>
  );
}
