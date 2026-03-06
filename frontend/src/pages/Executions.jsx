import { Play } from 'lucide-react';

export default function Executions() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Play className="w-6 h-6 text-indigo-600" />
        <h2 className="text-2xl font-bold text-zinc-900">Executions</h2>
      </div>
      <p className="text-zinc-500">Monitor live and past workflow executions.</p>
    </div>
  );
}
