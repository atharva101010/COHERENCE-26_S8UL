import { Handle, Position } from '@xyflow/react';
import { Smartphone } from 'lucide-react';

export default function SmsNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[160px] shadow-md transition-all
      ${selected ? 'border-violet-500 shadow-violet-200 ring-2 ring-violet-300' : 'border-violet-300'}
      bg-gradient-to-br from-violet-50 to-purple-100`}>
      <Handle type="target" position={Position.Top} className="!bg-violet-600 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <Smartphone className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-violet-600 uppercase tracking-wide">SMS</div>
          <div className="text-sm font-semibold text-violet-900">{data.label || 'Send SMS'}</div>
        </div>
      </div>
      {data.to && (
        <div className="mt-2 text-xs text-violet-600 bg-violet-200/50 px-2 py-0.5 rounded-full w-fit">
          To: {data.to}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-violet-600 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
