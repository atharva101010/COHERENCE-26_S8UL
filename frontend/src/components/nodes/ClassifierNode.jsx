import { Handle, Position } from '@xyflow/react';
import { Tags } from 'lucide-react';

export default function ClassifierNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[180px] shadow-md transition-all
      ${selected ? 'border-yellow-500 shadow-yellow-200 ring-2 ring-yellow-300' : 'border-yellow-400'}
      bg-gradient-to-br from-yellow-50 to-amber-100`}>
      <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center">
          <Tags className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Classifier</div>
          <div className="text-sm font-semibold text-yellow-900">{data.label || 'Classify'}</div>
        </div>
      </div>
      {data.categories && data.categories.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.categories.slice(0, 3).map((cat, i) => (
            <span key={i} className="text-[10px] bg-yellow-200/60 text-yellow-700 px-1.5 py-0.5 rounded">{cat}</span>
          ))}
          {data.categories.length > 3 && (
            <span className="text-[10px] text-yellow-500">+{data.categories.length - 3}</span>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
