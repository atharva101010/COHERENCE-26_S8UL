import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Play,
  Settings,
  Zap
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/workflows', label: 'Workflows', icon: GitBranch },
  { to: '/executions', label: 'Executions', icon: Play },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-zinc-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <Zap className="w-7 h-7 text-indigo-600" />
          <span className="text-xl font-bold text-zinc-900">FlowReach AI</span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Lead Outreach Automation</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-200">
        <p className="text-xs text-zinc-400 text-center">FlowReach AI v1.0</p>
      </div>
    </aside>
  );
}
