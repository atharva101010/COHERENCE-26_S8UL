import { Handle, Position } from '@xyflow/react';
import { Sparkles } from 'lucide-react';

export default function AIGenerateNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[180px] shadow-md transition-all
      ${selected ? 'border-violet-500 shadow-violet-200 ring-2 ring-violet-300' : 'border-violet-300'}
      bg-gradient-to-br from-violet-50 to-purple-100`}>
      <Handle type="target" position={Position.Top} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-violet-600 uppercase tracking-wide">AI Generate</div>
          <div className="text-sm font-semibold text-violet-900">{data.label || 'AI Generate'}</div>
        </div>
      </div>
      {data.tone && (
        <div className="mt-2 text-xs text-violet-600 bg-violet-200/50 px-2 py-0.5 rounded-full w-fit">
          Tone: {data.tone}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
