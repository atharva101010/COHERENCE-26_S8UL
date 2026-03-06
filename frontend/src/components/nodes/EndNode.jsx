import { Handle, Position } from '@xyflow/react';
import { Square } from 'lucide-react';

export default function EndNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[140px] shadow-md transition-all
      ${selected ? 'border-red-500 shadow-red-200 ring-2 ring-red-300' : 'border-red-300'}
      bg-gradient-to-br from-red-50 to-rose-100`}>
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
          <Square className="w-4 h-4 text-white fill-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-red-600 uppercase tracking-wide">End</div>
          <div className="text-sm font-semibold text-red-900">{data.label || 'End'}</div>
        </div>
      </div>
    </div>
  );
}
