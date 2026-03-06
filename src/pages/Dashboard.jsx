import { useState } from "react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts'
import { 
  LayoutDashboard, 
  BarChart3, 
  ShoppingBag, 
  Users, 
  ChevronDown,
  Download,
  Search,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Settings,
  HelpCircle,
  MoreVertical,
  Zap,
  LogOut
} from "lucide-react"
import { Button } from "../components/ui/Button"
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs"
import { motion } from "framer-motion"

const BAR_DATA = [
  { name: 'Jan', value: 1540, active: false },
  { name: 'Feb', value: 2100, active: false },
  { name: 'Mar', value: 3400, active: false },
  { name: 'Apr', value: 2800, active: false },
  { name: 'May', value: 4200, active: false },
  { name: 'Jun', value: 5500, active: false },
  { name: 'Jul', value: 6800, active: true },
  { name: 'Aug', value: 4800, active: false },
  { name: 'Sep', value: 5200, active: false },
  { name: 'Oct', value: 5800, active: false },
  { name: 'Nov', value: 6200, active: false },
  { name: 'Dec', value: 7500, active: false },
]

const PIE_DATA = [
  { name: 'Cold Outbound', value: 48, color: '#2563eb', products: '2,040 Active Leads' },
  { name: 'LinkedIn Reach', value: 33, color: '#3b82f6', products: '1,402 Contacts' },
  { name: 'Warm Referrals', value: 12, color: '#93c5fd', products: '510 Connections' },
  { name: 'Social Ads', value: 7, color: '#dbeafe', products: '297 Inquiries' },
]

export default function Dashboard() {
  const [activeSidebar, setActiveSidebar] = useState('dashboard')
  const [activeTopNav, setActiveTopNav] = useState('Campaigns')
  const [isPeriodOpen, setIsPeriodOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [activePeriod, setActivePeriod] = useState('Last 30 Days')

  const topNavItems = ['Overview', 'Analytics', 'Campaigns', 'Leads', 'Workflows', 'Sequences']
  const periods = ['Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'All Time']

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex">
      {/* Mini Sidebar */}
      <div className="w-20 border-r border-zinc-200 bg-white flex flex-col items-center py-8 gap-8 shrink-0">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
          <Zap className="w-6 h-6 fill-white" />
        </div>
        <nav className="flex flex-col gap-6">
           <NavItem icon={LayoutDashboard} active={activeSidebar === 'dashboard'} onClick={() => setActiveSidebar('dashboard')} />
           <NavItem icon={BarChart3} active={activeSidebar === 'analytics'} onClick={() => setActiveSidebar('analytics')} />
           <NavItem icon={ShoppingBag} active={activeSidebar === 'shopping'} onClick={() => setActiveSidebar('shopping')} />
           <NavItem icon={Users} active={activeSidebar === 'users'} onClick={() => setActiveSidebar('users')} />
           <NavItem icon={MessageCircle} active={activeSidebar === 'messages'} onClick={() => setActiveSidebar('messages')} />
           <NavItem icon={Settings} active={activeSidebar === 'settings'} onClick={() => setActiveSidebar('settings')} />
        </nav>
        <div className="mt-auto">
           <NavItem icon={HelpCircle} active={activeSidebar === 'help'} onClick={() => setActiveSidebar('help')} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Top Nav */}
        <header className="h-16 border-b border-zinc-100 bg-white flex items-center justify-between px-8">
          <div className="flex items-center gap-8">
            {topNavItems.map(item => (
              <span 
                key={item}
                onClick={() => { setActiveTopNav(item); setActiveSidebar('dashboard'); }}
                className={`cursor-pointer transition-colors ${
                  activeTopNav === item 
                    ? 'text-zinc-900 font-bold border-b-2 border-zinc-900 h-16 flex items-center px-1' 
                    : 'text-zinc-400 font-medium hover:text-zinc-900 h-16 flex items-center px-1 border-b-2 border-transparent'
                }`}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 relative">
             <div 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-4 cursor-pointer hover:bg-zinc-50 p-2 rounded-xl transition-colors"
             >
               <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jelly" alt="User" />
               </div>
               <span className="font-bold text-sm text-zinc-900 hidden sm:block">Outreach Admin</span>
               <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
             </div>

             {isProfileOpen && (
               <div className="absolute top-16 right-0 w-56 bg-white border border-zinc-100 shadow-xl rounded-xl overflow-hidden py-2 z-50">
                 <div className="px-4 py-3 border-b border-zinc-100 mb-2">
                    <p className="text-sm font-bold text-zinc-900">Outreach Admin</p>
                    <p className="text-xs text-zinc-500 font-medium truncate">admin@flowreach.ai</p>
                 </div>
                 <div className="px-2">
                   <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-50 cursor-pointer">
                     <Settings className="w-4 h-4" />
                     Account Settings
                   </div>
                   <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-50 cursor-pointer">
                     <Users className="w-4 h-4" />
                     Manage Team
                   </div>
                   <div className="h-px bg-zinc-100 my-2" />
                   <div 
                     onClick={() => alert('Logging out...')}
                     className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                   >
                     <LogOut className="w-4 h-4" />
                     Sign Out
                   </div>
                 </div>
               </div>
             )}
          </div>
        </header>

        {/* Content */}
        <main className="p-10 max-w-7xl mx-auto space-y-10">
          {activeSidebar === 'dashboard' ? (
            <>
              {/* Greeting */}
              <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900 tracking-tight">Good Afternoon, Admin! 👋</h1>
              <p className="text-zinc-500 mt-2 font-medium">Let's see the current outreach performance.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 relative z-50">
                 <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2">Data Period:</span>
                 <div className="relative">
                   <Button 
                     onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                     variant="outline" 
                     className="bg-zinc-50 border-zinc-100 rounded-2xl h-10 gap-4 font-bold text-xs uppercase tracking-wider w-40 justify-between px-4"
                   >
                     {activePeriod}
                     <ChevronDown className={`w-4 h-4 transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
                   </Button>

                   {isPeriodOpen && (
                     <div className="absolute top-12 right-0 w-40 bg-white border border-zinc-100 shadow-xl rounded-xl overflow-hidden py-1">
                       {periods.map(p => (
                         <div 
                           key={p} 
                           onClick={() => { setActivePeriod(p); setIsPeriodOpen(false); }}
                           className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-zinc-50 transition-colors ${activePeriod === p ? 'text-blue-600 bg-blue-50/50' : 'text-zinc-600'}`}
                         >
                           {p}
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
              </div>
              <Button onClick={() => alert('Data download started.')} variant="outline" className="rounded-2xl h-10 px-6 font-bold text-xs uppercase tracking-wider border-zinc-200">
                Download Data
              </Button>
            </div>
          </div>

          {/* Conditional Rendering Based on Top Navigation */}
          {activeTopNav === 'Campaigns' && (
            <Tabs defaultValue="insights" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="insights">Outreach Insights</TabsTrigger>
              <TabsTrigger value="preparation">Lead Sourcing</TabsTrigger>
              <TabsTrigger value="service">Inbox Hub</TabsTrigger>
              <TabsTrigger value="composition">Campaign Stats</TabsTrigger>
              <TabsTrigger value="marketing">Visual Sequences</TabsTrigger>
              <TabsTrigger value="settings">Platform Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="insights">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard 
                  label="Total Leads Scored"
                  value="12,599"
                  trend="- 2.33%"
                  trendDown
                  icon={<BarChart3 className="w-5 h-5" />}
                />
                <StatCard 
                  label="Messages Sent"
                  value="6,132"
                  trend="- 1.24%"
                  trendDown
                  icon={<MessageCircle className="w-5 h-5" />}
                />
                <StatCard 
                  label="Converted Leads"
                  value="4,250"
                  trend="+ 0.58%"
                  icon={<Users className="w-5 h-5" />}
                />
                <Card className="bg-blue-600 border-none text-white p-8 relative overflow-hidden flex flex-col justify-between hover:border-zinc-100 hover:-translate-y-0 translate-y-0 hover:shadow-sm">
                   <div>
                     <Badge className="bg-white/20 text-white border-none rounded-full px-4 font-bold text-[10px] uppercase mb-4">AI Performance</Badge>
                     <p className="text-lg font-medium leading-relaxed">This month outreach has increased fantastically <span className="font-extrabold underline decoration-white-200 underline-offset-4">54%</span> due to AI personalization. Target met.</p>
                   </div>
                   <Button onClick={() => alert('Opening full report...')} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs text-center w-full mt-6 rounded-2xl backdrop-blur-md">
                      View full report
                   </Button>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <Card className="lg:col-span-2">
                   <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-zinc-50 rounded-lg">
                           <TrendingUp className="w-5 h-5 text-zinc-900" />
                         </div>
                         <CardTitle className="text-zinc-900 font-bold">Analytics</CardTitle>
                      </div>
                      <Button variant="outline" className="rounded-2xl bg-zinc-50 border-zinc-100 gap-4 text-xs font-bold px-4 hover:-translate-y-0">
                        Total Outreach Volume
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                      </Button>
                   </CardHeader>
                   <CardContent className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={BAR_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} 
                              dy={10}
                            />
                            <Tooltip 
                              cursor={{ fill: 'transparent' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg">
                                      {payload[0].value.toLocaleString()}
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
                               {BAR_DATA.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.active ? '#2563eb' : '#000000'} />
                               ))}
                            </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                   </CardContent>
                </Card>

                <Card>
                   <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-zinc-50 rounded-lg">
                           <ShoppingBag className="w-5 h-5 text-zinc-900" />
                         </div>
                         <CardTitle className="text-zinc-900 font-bold">Channel Distribution</CardTitle>
                      </div>
                      <MoreVertical className="w-4 h-4 text-zinc-400" />
                   </CardHeader>
                   <CardContent className="space-y-8">
                      <div className="h-[200px] w-full flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                              <Pie
                                data={PIE_DATA}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {PIE_DATA.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                           </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center">
                           <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total</span>
                           <span className="text-xl font-extrabold text-zinc-900">4,250</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Active Leads</h4>
                         {PIE_DATA.map((item) => (
                           <div key={item.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                 <span className="text-xs font-bold text-zinc-600">{item.name}</span>
                              </div>
                              <div className="text-right">
                                 <div className="text-xs font-extrabold text-zinc-900">{item.value}%</div>
                                 <div className="text-[10px] text-zinc-400 font-bold">{item.products}</div>
                              </div>
                           </div>
                         ))}
                      </div>
                   </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preparation">
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                <Search className="w-12 h-12 text-zinc-300 mb-4" />
                <h3 className="text-xl font-bold text-zinc-900">Lead Sourcing Hub</h3>
                <p className="text-zinc-500 mt-2 font-medium">Connect your LinkedIn or upload a CSV to build targeted lists.</p>
                <Button className="mt-6 rounded-2xl px-8 font-bold text-sm bg-blue-600 text-white hover:bg-blue-700">Add New Leads</Button>
              </div>
            </TabsContent>

            <TabsContent value="service">
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                <MessageCircle className="w-12 h-12 text-zinc-300 mb-4" />
                <h3 className="text-xl font-bold text-zinc-900">Unified Inbox</h3>
                <p className="text-zinc-500 mt-2 font-medium">All your multi-channel conversations in one place. You're all caught up!</p>
              </div>
            </TabsContent>

            <TabsContent value="composition">
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                <BarChart3 className="w-12 h-12 text-zinc-300 mb-4" />
                <h3 className="text-xl font-bold text-zinc-900">Detailed Campaign Metrics</h3>
                <p className="text-zinc-500 mt-2 font-medium">Granular analytics on open rates, clicks, and sentiment.</p>
              </div>
            </TabsContent>

            <TabsContent value="marketing">
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                <BarChart3 className="w-12 h-12 text-zinc-300 mb-4" />
                <h3 className="text-xl font-bold text-zinc-900">Visual Sequences</h3>
                <p className="text-zinc-500 mt-2 font-medium">Drag-and-drop workflow builder. Design your next multi-channel flow.</p>
                <Button className="mt-6 rounded-2xl px-8 font-bold text-sm bg-blue-600 text-white hover:bg-blue-700">Create Workflow</Button>
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                <Settings className="w-12 h-12 text-zinc-300 mb-4" />
                <h3 className="text-xl font-bold text-zinc-900">Platform Settings</h3>
                <p className="text-zinc-500 mt-2 font-medium">Configure connected accounts, AI limits, and billing.</p>
              </div>
            </TabsContent>
          </Tabs>
          )}

          {activeTopNav === 'Overview' && (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <LayoutDashboard className="w-16 h-16 text-zinc-300 mb-6" />
              <h2 className="text-2xl font-bold text-zinc-900">Platform Overview</h2>
              <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">Get a high-level summary of your entire outreach platform, active connected accounts, and AI quota usage.</p>
              <Button className="mt-8 rounded-2xl px-8 font-bold text-sm bg-blue-600 text-white hover:bg-blue-700">Generate Full Report</Button>
            </div>
          )}

          {activeTopNav === 'Analytics' && (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <BarChart3 className="w-16 h-16 text-zinc-300 mb-6" />
              <h2 className="text-2xl font-bold text-zinc-900">Global Analytics</h2>
              <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">Dive deep into historical data, A/B testing results, and AI-driven conversion insights.</p>
            </div>
          )}

          {activeTopNav === 'Leads' && (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <Users className="w-16 h-16 text-zinc-300 mb-6" />
              <h2 className="text-2xl font-bold text-zinc-900">Lead Management</h2>
              <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">Manage your CRM, view enriched lead profiles, and organize your smart lists.</p>
              <div className="flex gap-4 mt-8">
                <Button variant="outline" className="rounded-2xl px-8 font-bold text-sm">Import CSV</Button>
                <Button className="rounded-2xl px-8 font-bold text-sm bg-blue-600 text-white hover:bg-blue-700">Add Lead Manually</Button>
              </div>
            </div>
          )}

          {activeTopNav === 'Workflows' && (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <Settings className="w-16 h-16 text-zinc-300 mb-6" />
              <h2 className="text-2xl font-bold text-zinc-900">Automation Workflows</h2>
              <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">Build and manage multi-channel AI outreach sequences triggered by specific lead behaviors.</p>
              <Button className="mt-8 rounded-2xl px-8 font-bold text-sm bg-blue-600 text-white hover:bg-blue-700">Create Workflow</Button>
            </div>
          )}

          {activeTopNav === 'Sequences' && (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <MessageCircle className="w-16 h-16 text-zinc-300 mb-6" />
              <h2 className="text-2xl font-bold text-zinc-900">Message Sequences</h2>
              <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">Edit your AI prompt libraries, email templates, and LinkedIn connection request strategies.</p>
            </div>
          )}
            </>
          ) : (
            <>
              {activeSidebar === 'analytics' && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                  <BarChart3 className="w-16 h-16 text-zinc-300 mb-6" />
                  <h2 className="text-2xl font-bold text-zinc-900">Advanced Analytics Hub</h2>
                  <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">Comprehensive breakdown of your outreach performance across all campaigns.</p>
                  <Button className="mt-8 rounded-2xl px-8 font-bold text-sm bg-blue-600 text-white hover:bg-blue-700">Export All Data</Button>
                </div>
              )}
              {activeSidebar === 'shopping' && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                  <ShoppingBag className="w-16 h-16 text-zinc-300 mb-6" />
                  <h2 className="text-2xl font-bold text-zinc-900">Plugin Marketplace</h2>
                  <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">Browse and install new AI models, data enrichment providers, and CRM integrations.</p>
                </div>
              )}
              {activeSidebar === 'users' && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                  <Users className="w-16 h-16 text-zinc-300 mb-6" />
                  <h2 className="text-2xl font-bold text-zinc-900">Team Directory</h2>
                  <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">Manage your organization's members, roles, permissions, and audit logs.</p>
                </div>
              )}
              {activeSidebar === 'messages' && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                  <MessageCircle className="w-16 h-16 text-zinc-300 mb-6" />
                  <h2 className="text-2xl font-bold text-zinc-900">Global Inbox</h2>
                  <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">A unified view of all replies, auto-categorized by AI to help you close deals faster.</p>
                </div>
              )}
              {activeSidebar === 'settings' && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                  <Settings className="w-16 h-16 text-zinc-300 mb-6" />
                  <h2 className="text-2xl font-bold text-zinc-900">Global Settings</h2>
                  <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">Configure billing, API keys, webhook endpoints, and platform defaults.</p>
                </div>
              )}
              {activeSidebar === 'help' && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-zinc-100 shadow-sm">
                  <HelpCircle className="w-16 h-16 text-zinc-300 mb-6" />
                  <h2 className="text-2xl font-bold text-zinc-900">Help & Documentation</h2>
                  <p className="text-zinc-500 mt-2 font-medium max-w-md text-center">Access API docs, video tutorials, and contact our 24/7 technical support team.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function NavItem({ icon: Icon, active = false, onClick }) {
  return (
    <div onClick={onClick} className={`p-3 rounded-xl cursor-pointer transition-all ${active ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900'}`}>
       <Icon className="w-6 h-6" />
    </div>
  )
}

function StatCard({ label, value, trend, trendDown, icon }) {
  return (
    <Card className="hover:border-zinc-300 transition-colors group">
       <CardContent className="p-8 space-y-4 hover:-translate-y-0 translate-y-0 hover:shadow-sm">
          <div className="flex items-center justify-between">
             <div className="p-2.5 bg-zinc-50 rounded-xl group-hover:bg-zinc-100 transition-colors">
                {icon}
             </div>
             <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${trendDown ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {trendDown ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {trend}
             </div>
          </div>
          <div>
            <div className="text-4xl font-extrabold text-zinc-900 tracking-tight">{value}</div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-2">{label}</p>
          </div>
       </CardContent>
    </Card>
  )
}

function Badge({ children, className }) {
   return <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${className}`}>{children}</span>
}
