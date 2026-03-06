import { useState } from "react"
import { 
  LayoutDashboard, 
  Users, 
  GitBranch, 
  Settings, 
  LogOut, 
  Zap, 
  Bell,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="relative flex flex-col glass border-r border-zinc-200/50 z-30"
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-zinc-100">
          <div className="w-8 h-8 rounded-lg premium-gradient flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          {isSidebarOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-lg tracking-tight text-zinc-900"
            >
              FlowReach<span className="text-indigo-600"> AI</span>
            </motion.span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active isSidebarOpen={isSidebarOpen} />
          <NavItem icon={Users} label="Leads" isSidebarOpen={isSidebarOpen} />
          <NavItem icon={GitBranch} label="Workflows" isSidebarOpen={isSidebarOpen} />
          <div className="my-4 h-px bg-zinc-100 mx-3" />
          <NavItem icon={Settings} label="Settings" isSidebarOpen={isSidebarOpen} />
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-zinc-100">
          <button className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200">
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="text-sm font-medium">Log out</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 border border-zinc-200 bg-white rounded-full flex items-center justify-center text-zinc-400 hover:text-indigo-600 transition-colors shadow-sm"
        >
          {isSidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 glass border-b border-zinc-200/50 flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-4">
             <h1 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Overview</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white" />
            </button>
            <div className="w-8 h-8 rounded-full premium-gradient" />
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

function NavItem({ icon: Icon, label, active = false, isSidebarOpen }) {
  return (
    <button className={`
      relative group flex items-center gap-3 w-full h-11 px-3 rounded-xl transition-all duration-200
      ${active 
        ? "bg-indigo-50 text-indigo-600 shadow-[0_4px_12px_-2px_rgba(79,70,229,0.12)]" 
        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"}
    `}>
      <Icon className={`w-5 h-5 shrink-0 ${active ? "text-indigo-600" : "text-zinc-400 group-hover:text-zinc-900"}`} />
      {isSidebarOpen && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm font-semibold whitespace-nowrap"
        >
          {label}
        </motion.span>
      )}
      {active && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute left-0 w-1 h-5 bg-indigo-600 rounded-r-full"
        />
      )}
    </button>
  )
}
