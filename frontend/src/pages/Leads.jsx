import { Users } from 'lucide-react';

export default function Leads() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-zinc-900">Leads</h2>
      </div>
      <p className="text-zinc-500">Manage and import your leads for outreach.</p>
    </div>
  );
}
