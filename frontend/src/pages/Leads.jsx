import { useState } from 'react';
import { Users, Upload } from 'lucide-react';
import LeadsTable from '../components/LeadsTable';
import LeadImport from '../components/LeadImport';

const TABS = [
  { id: 'all', label: 'All Leads', icon: Users },
  { id: 'import', label: 'Import', icon: Upload },
];

export default function Leads() {
  const [activeTab, setActiveTab] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImportComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-zinc-900">Leads</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100/80 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === id
                ? 'bg-white text-zinc-900 shadow-sm shadow-zinc-200/50'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'all' && <LeadsTable refreshTrigger={refreshTrigger} />}
      {activeTab === 'import' && <LeadImport onImportComplete={handleImportComplete} />}
    </div>
  );
}
