import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-zinc-900">Settings</h2>
      </div>
      <p className="text-zinc-500">Configure safety controls, email settings, and blacklist.</p>
    </div>
  );
}
