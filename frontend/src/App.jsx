import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Workflows from './pages/Workflows';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Executions from './pages/Executions';
import Settings from './pages/Settings';
import AIChat from './pages/AIChat';
import Messages from './pages/Messages';
import Channels from './pages/Channels';
import Profile from './pages/Profile';

function App() {
  return (
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
      </Route>
      <Route path="/workflows/:id" element={<WorkflowBuilder />} />
    </Routes>
  );
}

export default App;
