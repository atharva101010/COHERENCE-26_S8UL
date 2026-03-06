import { Handle, Position } from '@xyflow/react';
import { Webhook } from 'lucide-react';

export default function WebhookNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[170px] shadow-md transition-all
      ${selected ? 'border-pink-500 shadow-pink-200 ring-2 ring-pink-300' : 'border-pink-300'}
      bg-gradient-to-br from-pink-50 to-rose-100`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
          <Webhook className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-pink-600 uppercase tracking-wide">Webhook</div>
          <div className="text-sm font-semibold text-pink-900">{data.label || 'Webhook Trigger'}</div>
        </div>
      </div>
      {data.path && (
        <div className="mt-2 text-xs text-pink-600 bg-pink-200/50 px-2 py-0.5 rounded-full w-fit truncate max-w-[180px]">
          /{data.path}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
