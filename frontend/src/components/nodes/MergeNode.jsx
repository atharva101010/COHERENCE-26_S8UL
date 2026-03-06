import { Handle, Position } from '@xyflow/react';
import { Merge } from 'lucide-react';

export default function MergeNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[160px] shadow-md transition-all
      ${selected ? 'border-lime-500 shadow-lime-200 ring-2 ring-lime-300' : 'border-lime-300'}
      bg-gradient-to-br from-lime-50 to-green-100`}>
      <Handle type="target" position={Position.Top} id="input-a" className="!bg-lime-500 !w-3 !h-3 !border-2 !border-white !left-[30%]" />
      <Handle type="target" position={Position.Top} id="input-b" className="!bg-lime-500 !w-3 !h-3 !border-2 !border-white !left-[70%]" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-lime-500 flex items-center justify-center">
          <Merge className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-lime-600 uppercase tracking-wide">Merge</div>
          <div className="text-sm font-semibold text-lime-900">{data.label || 'Merge'}</div>
        </div>
      </div>
      {data.mode && (
        <div className="mt-2 text-xs text-lime-700 bg-lime-200/50 px-2 py-0.5 rounded-full w-fit">
          {data.mode}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-lime-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
