import { useLocation } from 'react-router-dom';
import { Bell, Search, Sparkles } from 'lucide-react';

const pageTitles = {
  '/': 'Dashboard',
  '/leads': 'Leads',
  '/workflows': 'Workflows',
  '/executions': 'Executions',
  '/settings': 'Settings',
};

const pageDescriptions = {
  '/': 'Your outreach performance at a glance',
  '/leads': 'Manage and import your leads',
  '/workflows': 'Build automation workflows',
  '/executions': 'Monitor workflow executions',
  '/settings': 'Configure your preferences',
};

export default function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'FlowReach AI';

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-zinc-200/60 flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="pl-9 pr-4 py-2 text-sm bg-zinc-50/80 border border-zinc-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 w-64 transition-all placeholder:text-zinc-400"
          />
        </div>

        <button className="relative p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200">
          <Sparkles className="w-5 h-5" />
        </button>

        <button className="relative p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full" />
        </button>

        <div className="w-px h-8 bg-zinc-200/60 mx-1" />

        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200/50 cursor-pointer hover:shadow-lg hover:shadow-indigo-300/50 transition-all">
          <span className="text-white text-sm font-bold">H</span>
        </div>
      </div>
    </header>
  );
}
