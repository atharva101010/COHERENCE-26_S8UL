import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));
const Workflows = lazy(() => import('./pages/Workflows'));
const WorkflowBuilder = lazy(() => import('./pages/WorkflowBuilder'));
const Executions = lazy(() => import('./pages/Executions'));
const Settings = lazy(() => import('./pages/Settings'));
const AIChat = lazy(() => import('./pages/AIChat'));
const Messages = lazy(() => import('./pages/Messages'));
const Channels = lazy(() => import('./pages/Channels'));
const Profile = lazy(() => import('./pages/Profile'));
const Templates = lazy(() => import('./pages/Templates'));
const LeadScoring = lazy(() => import('./pages/LeadScoring'));
const ABTesting = lazy(() => import('./pages/ABTesting'));
const EmailTracking = lazy(() => import('./pages/EmailTracking'));
const FollowUpSequences = lazy(() => import('./pages/FollowUpSequences'));
const Webhooks = lazy(() => import('./pages/Webhooks'));
const LeadEnrichment = lazy(() => import('./pages/LeadEnrichment'));
const AnalyticsExport = lazy(() => import('./pages/AnalyticsExport'));
const CRMIntegrations = lazy(() => import('./pages/CRMIntegrations'));
const CalendarIntegration = lazy(() => import('./pages/CalendarIntegration'));
const TeamCollaboration = lazy(() => import('./pages/TeamCollaboration'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/executions" element={<Executions />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/ai" element={<AIChat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/lead-scoring" element={<LeadScoring />} />
        <Route path="/ab-testing" element={<ABTesting />} />
        <Route path="/email-tracking" element={<EmailTracking />} />
        <Route path="/follow-ups" element={<FollowUpSequences />} />
        <Route path="/webhooks" element={<Webhooks />} />
        <Route path="/lead-enrichment" element={<LeadEnrichment />} />
        <Route path="/analytics-export" element={<AnalyticsExport />} />
        <Route path="/crm" element={<CRMIntegrations />} />
        <Route path="/calendar" element={<CalendarIntegration />} />
        <Route path="/team" element={<TeamCollaboration />} />
      </Route>
      <Route path="/workflows/:id" element={<WorkflowBuilder />} />
    </Routes>
    </Suspense>
  );
}

export default App;
