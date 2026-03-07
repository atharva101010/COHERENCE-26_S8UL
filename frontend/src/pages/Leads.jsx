import { useState } from 'react';
import { Users, Upload, Download } from 'lucide-react';
import LeadsTable from '../components/LeadsTable';
import LeadImport from '../components/LeadImport';

const TABS = [
  { id: 'all', label: 'All Leads', icon: Users },
  { id: 'import', label: 'Import', icon: Upload },
];

const sampleCSV = `name,email,company,title,status
Aarav Sharma,aarav@techcorp.io,TechCorp India,CEO,new
Ishita Patel,ishita@innovatelabs.io,InnovateLabs,CTO,new
Rohan Gupta,rohan@cloudpulse.io,CloudPulse AI,VP Engineering,contacted
Priya Singh,priya@datavista.io,DataVista,Product Manager,new
Vikram Kumar,vikram@nexaflow.io,NexaFlow,Director of Sales,replied`;

export default function Leads() {
  const [activeTab, setActiveTab] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleImportComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
    setActiveTab('all');
  };

  const downloadSampleCSV = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-leads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Leads</h2>
        </div>
        <button
          onClick={downloadSampleCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:border-zinc-600 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download Sample CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              activeTab === id
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm shadow-zinc-200/50'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300'
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
