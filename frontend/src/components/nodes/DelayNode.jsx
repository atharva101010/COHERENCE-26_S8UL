import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';

export default function DelayNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[160px] shadow-md transition-all
      ${selected ? 'border-amber-500 shadow-amber-200 ring-2 ring-amber-300' : 'border-amber-300'}
      bg-gradient-to-br from-amber-50 to-yellow-100`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
          <Clock className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-amber-600 uppercase tracking-wide">Delay</div>
          <div className="text-sm font-semibold text-amber-900">{data.label || 'Delay'}</div>
        </div>
      </div>
      {data.duration && (
        <div className="mt-2 text-xs text-amber-700 bg-amber-200/50 px-2 py-0.5 rounded-full w-fit">
          {data.duration} {data.unit || 'days'}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
