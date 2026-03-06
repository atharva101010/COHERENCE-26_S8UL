import { Handle, Position } from '@xyflow/react';
import { Filter } from 'lucide-react';

export default function FilterNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[170px] shadow-md transition-all
      ${selected ? 'border-indigo-500 shadow-indigo-200 ring-2 ring-indigo-300' : 'border-indigo-300'}
      bg-gradient-to-br from-indigo-50 to-blue-100`}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <Filter className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Filter</div>
          <div className="text-sm font-semibold text-indigo-900">{data.label || 'Filter'}</div>
        </div>
      </div>
      {data.rules && data.rules.length > 0 && (
        <div className="mt-2 text-xs text-indigo-600 bg-indigo-200/50 px-2 py-0.5 rounded-full w-fit">
          {data.rules.length} rule(s)
        </div>
      )}
      <Handle type="source" position={Position.Bottom} id="match" className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="no-match" className="!bg-red-500 !w-3 !h-3 !border-2 !border-white !left-[70%]" />
    </div>
  );
}
