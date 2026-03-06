import { Handle, Position } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

export default function SlackNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[170px] shadow-md transition-all
      ${selected ? 'border-green-500 shadow-green-200 ring-2 ring-green-300' : 'border-green-300'}
      bg-gradient-to-br from-green-50 to-emerald-100`}>
      <Handle type="target" position={Position.Top} className="!bg-green-600 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-green-600 uppercase tracking-wide">Slack</div>
          <div className="text-sm font-semibold text-green-900">{data.label || 'Slack Message'}</div>
        </div>
      </div>
      {data.channel && (
        <div className="mt-2 text-xs text-green-700 bg-green-200/50 px-2 py-0.5 rounded-full w-fit">
          #{data.channel}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-green-600 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
