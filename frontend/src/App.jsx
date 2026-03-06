import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Workflows from './pages/Workflows';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Executions from './pages/Executions';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/executions" element={<Executions />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/workflows/:id" element={<WorkflowBuilder />} />
    </Routes>
  );
}

export default App;
