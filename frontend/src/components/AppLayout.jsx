import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Keyboard, X } from 'lucide-react';
import Sidebar from './Sidebar';
import { supabase } from '../supabaseClient';

const shortcuts = [
  { key: 'D', label: 'Dashboard', path: '/dashboard' },
  { key: 'L', label: 'Leads', path: '/leads' },
  { key: 'W', label: 'Workflows', path: '/workflows' },
  { key: 'E', label: 'Executions', path: '/executions' },
  { key: 'S', label: 'Settings', path: '/settings' },
  { key: 'A', label: 'AI Assistant', path: '/ai' },
  { key: 'P', label: 'Profile', path: '/profile' },
  { key: '?', label: 'Show this help', path: null },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) {
        navigate('/');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleKeyboard = useCallback((e) => {
    // Ignore when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;                 
    const key = e.key.toLowerCase();
    if (key === '?' || (key === '/' && e.shiftKey)) { setShowHelp(h => !h); return; }                                                                               
    if (key === 'escape') { setShowHelp(false); return; }

    const match = shortcuts.find(s => s.key.toLowerCase() === key && s.path);   
    if (match) {
      e.preventDefault();
      navigate(match.path);
    }
  }, [navigate]);

  useEffect(() => {
    globalThis.addEventListener('keydown', handleKeyboard);
    return () => globalThis.removeEventListener('keydown', handleKeyboard);     
  }, [handleKeyboard]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-100 dark:bg-[#0f0f13]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100 dark:bg-[#0f0f13]">                                                                                  
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto w-full">                                                                                      
        <main className="flex-1 h-full p-6">
          <Outlet />
        </main>
        {/* Keyboard shortcut hint */}
        <button
          onClick={() => setShowHelp(true)}
          className="fixed bottom-4 right-4 p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg text-zinc-400 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-500 transition-all z-30"                                                                                  
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm border-none"                                                                                           
            onClick={() => setShowHelp(false)}
            aria-label="Close keyboard shortcuts"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">                                                                         
          <div
            className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 pointer-events-auto"                                                         
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">                                                             
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />                                                                                           
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Keyboard Shortcuts</h3>                                                                
              </div>
              <button onClick={() => setShowHelp(false)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">                                                                        
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {shortcuts.map(s => (
                <div key={s.key} className="flex items-center justify-between py-1.5">                                                                                            
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{s.label}</span>                                                                                     
                  <kbd className="px-2.5 py-1 text-xs font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300">{s.key}</kbd>                                               
                </div>
              ))}
              <div className="flex items-center justify-between py-1.5">        
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Close modal</span>                                                                                   
                <kbd className="px-2.5 py-1 text-xs font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300">Esc</kbd>                                                   
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
