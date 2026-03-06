import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, ArrowRight, Zap, Search, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 selection:text-primary">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
              <Zap size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">FlowReach</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Product</a>
            <a href="#" className="hover:text-foreground transition-colors">Resources</a>
            <a href="#" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#" className="hover:text-foreground transition-colors">Company</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden sm:flex text-muted-foreground hover:text-foreground" onClick={() => navigate('/dashboard')}>Log in</Button>
          <Button onClick={() => navigate('/dashboard')} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">Create account</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center pt-24 pb-16 px-4 text-center mt-12 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        <Badge variant="outline" className="mb-8 px-4 py-1.5 bg-card border-border text-muted-foreground hover:bg-muted cursor-pointer rounded-full shadow-sm">
          <span className="mr-2">🎉</span> FlowReach 2.0 <span className="mx-2 text-muted-foreground/30">-</span> See what's new <ArrowRight size={14} className="ml-1 inline hover:translate-x-0.5 transition-transform" />
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mb-6 leading-[1.1]">
          Supercharge your <br className="hidden md:block" /> CRM experience
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 font-medium">
          Next-level insights, campaigns, and seamless integration solutions.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Button variant="outline" size="lg" className="px-8 h-12 text-base font-medium rounded-full border-border bg-card hover:bg-muted shadow-sm" onClick={() => navigate('/dashboard')}>
            <Play size={18} className="mr-2 fill-current" /> Demo
          </Button>
          <Button size="lg" className="px-8 h-12 text-base font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={() => navigate('/dashboard')}>
            Get started
          </Button>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-20 w-full max-w-5xl rounded-t-2xl md:rounded-2xl border border-border bg-card/40 backdrop-blur-xl shadow-2xl shadow-primary/5 overflow-hidden">
          <div className="flex bg-muted/50 border-b border-border p-4 items-center justify-between">
             <div className="flex gap-2">
               <div className="w-3 h-3 rounded-full bg-destructive/60"></div>
               <div className="w-3 h-3 rounded-full bg-amber-500/60"></div>
               <div className="w-3 h-3 rounded-full bg-emerald-500/60"></div>
             </div>
             <div className="flex space-x-3 text-muted-foreground/60">
                <Search size={14} />
                <Bell size={14} />
                <div className="w-4 h-4 rounded-sm bg-muted-foreground/20"></div>
             </div>
          </div>
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-70 pointer-events-none bg-background/50">
             {/* Mock cards using highly semantic styling */}
             <div className="col-span-1 rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground text-sm">Activation</h3>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-medium">1 month</Badge>
                </div>
                <div className="text-4xl font-bold text-foreground mb-2 tracking-tight">62% <span className="text-sm font-semibold text-emerald-500 ml-1">+5%</span></div>
                <div className="space-y-3 mt-6">
                   {[100, 73, 51, 80, 7].map((val, i) => (
                     <div key={i} className="flex flex-col gap-1">
                       <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                         <span>Step {i+1}</span>
                         <span>{val}%</span>
                       </div>
                       <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                         <div className="bg-primary/70 h-full rounded-full" style={{width: `${val}%`}}></div>
                       </div>
                     </div>
                   ))}
                </div>
             </div>
             
             <div className="col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground text-sm">Daily active</h3>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-medium">7 days</Badge>
                </div>
                <div className="text-4xl font-bold text-foreground mb-2 tracking-tight">75,382 <span className="text-sm font-semibold text-destructive ml-1">-2%</span></div>
                <div className="h-40 mt-6 flex items-end justify-between gap-3">
                   {[40, 60, 30, 80, 50, 40, 90, 60, 75, 45, 85].map((val, i) => (
                     <div key={i} className="w-full bg-primary/10 rounded-t-sm relative group cursor-pointer hover:bg-primary/20 transition-all" style={{height: `${val}%`}}>
                        <div className="absolute top-0 w-full bg-primary rounded-t-sm h-1.5 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
