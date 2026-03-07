import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Search, Sparkles, Wifi, WifiOff, Moon, Sun, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

const pageTitles = {
  '/': 'Dashboard',
  '/leads': 'Leads',
  '/workflows': 'Workflows',
  '/executions': 'Executions',
  '/settings': 'Settings',
  '/ai': 'AI Assistant',
  '/profile': 'Profile',
};

const pageDescriptions = {
  '/': 'Your outreach performance at a glance',
  '/leads': 'Manage and import your leads',
  '/workflows': 'Build automation workflows',
  '/executions': 'Monitor workflow executions',
  '/settings': 'Configure your preferences',
  '/ai': 'Chat with your AI assistant',
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = pageTitles[location.pathname] || 'FlowReach AI';
  const [online, setOnline] = useState(true);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    // Sync DOM class with state on mount
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`${import.meta.env.VITE_API_URL || ''}/health`, { signal: AbortSignal.timeout(3000) });
        setOnline(r.ok);
      } catch { setOnline(false); }
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* System Status */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
          online ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
        }`}>
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? 'Online' : 'Offline'}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="pl-9 pr-4 py-2 text-sm bg-zinc-50/80 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 dark:focus:border-indigo-500 w-64 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 dark:text-zinc-200"
          />
        </div>

        <button className="relative p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded-xl transition-all duration-200">
          <Sparkles className="w-5 h-5" />
        </button>

        <button
          onClick={toggleDark}
          className="relative p-2 text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:text-yellow-300 dark:hover:bg-zinc-700 rounded-xl transition-all duration-200"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="relative p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full" />
        </button>

        <div className="w-px h-8 bg-zinc-200/60 dark:bg-zinc-700/60 mx-1" />

        <Link to="/profile" className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200/50 cursor-pointer hover:shadow-lg hover:shadow-indigo-300/50 transition-all" title="Profile">
          <span className="text-white text-sm font-bold">H</span>
        </Link>

        <button
          onClick={async () => { await supabase.auth.signOut(); toast.success('Signed out'); navigate('/'); }}
          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
