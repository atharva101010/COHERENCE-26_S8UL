import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export default function ConditionNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[180px] shadow-md transition-all
      ${selected ? 'border-orange-500 shadow-orange-200 ring-2 ring-orange-300' : 'border-orange-300'}
      bg-gradient-to-br from-orange-50 to-rose-100`}>
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
          <GitBranch className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-orange-600 uppercase tracking-wide">Condition</div>
          <div className="text-sm font-semibold text-orange-900">{data.label || 'Condition'}</div>
        </div>
      </div>
      {data.field && (
        <div className="mt-2 text-xs text-orange-700 bg-orange-200/50 px-2 py-0.5 rounded-full w-fit">
          {data.field} {data.operator} {data.value}
        </div>
      )}
      <div className="flex justify-between mt-2 px-1">
        <span className="text-[10px] font-medium text-emerald-600">Yes</span>
        <span className="text-[10px] font-medium text-red-500">No</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="no" className="!bg-red-500 !w-3 !h-3 !border-2 !border-white !left-[70%]" />
    </div>
  );
}
