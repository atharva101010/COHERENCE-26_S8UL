import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Home, MessageSquare, BarChart2, Workflow, Users, Settings, Bell, CircleUser, ChevronRight } from 'lucide-react';

const navItems = [
  { section: 'Overview', items: [
    { name: 'Dashboard', icon: Home, path: '/dashboard', badge: null },
    { name: 'Reports', icon: BarChart2, path: '/reports', badge: null },
  ]},
  { section: 'Tools', items: [
    { name: 'Messages', icon: MessageSquare, path: '/messages', badge: '12' },
    { name: 'Workflows', icon: Workflow, path: '/workflows', badge: null },
    { name: 'Leads', icon: Users, path: '/leads', badge: null },
  ]},
  { section: 'Metrics', items: [
    { name: 'Settings', icon: Settings, path: '/settings', badge: null },
  ]}
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[260px] bg-sidebar border-r border-sidebar-border h-full flex flex-col font-sans transition-all duration-300">
      
      {/* Brand area */}
      <div className="h-16 flex items-center px-6">
        <Link to="/" className="flex items-center gap-2 group cursor-pointer w-full">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22h20L12 2z" fill="white"/>
            </svg>
          </div>
          <span className="font-bold text-[17px] text-sidebar-foreground tracking-tight group-hover:text-primary transition-colors">FlowReach AI</span>
        </Link>
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {navItems.map((section, idx) => (
          <div key={idx}>
            <h4 className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2">{section.section}</h4>
            <nav className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/dashboard');
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-[9px] text-[13px] font-medium rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' 
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary' : 'text-sidebar-foreground/50'}`} />
                      {item.name}
                    </div>
                    {item.badge && (
                      <Badge variant={isActive ? 'default' : 'secondary'} className={`h-5 px-1.5 text-[10px] font-bold ${!isActive && 'bg-sidebar-accent/50 text-sidebar-foreground/60 border-sidebar-border/50'}`}>
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Profile Area */}
      <div className="p-4 mt-auto">
         <Separator className="mb-4 bg-sidebar-border" />
         <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-sidebar-foreground shadow-sm">
                <CircleUser size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-sidebar-foreground">Kamlesh</span>
                <span className="text-[11px] font-medium text-sidebar-foreground/50">Pro Plan</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sidebar-foreground/50">
               <Bell size={16} className="hover:text-sidebar-foreground cursor-pointer transition-colors" />
            </div>
         </div>
      </div>
    </aside>
  );
}
