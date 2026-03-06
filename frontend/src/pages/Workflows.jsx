import { GitBranch } from 'lucide-react';

export default function Workflows() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GitBranch className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-zinc-900">Workflows</h2>
      </div>
      <p className="text-zinc-500">Build and manage your outreach automation workflows.</p>
    </div>
  );
}
