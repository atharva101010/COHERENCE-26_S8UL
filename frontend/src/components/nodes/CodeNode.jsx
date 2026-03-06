import { Handle, Position } from '@xyflow/react';
import { Code } from 'lucide-react';

export default function CodeNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[170px] shadow-md transition-all
      ${selected ? 'border-zinc-600 shadow-zinc-200 ring-2 ring-zinc-400' : 'border-zinc-400'}
      bg-gradient-to-br from-zinc-50 to-zinc-200`}>
      <Handle type="target" position={Position.Top} className="!bg-zinc-600 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center">
          <Code className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Code</div>
          <div className="text-sm font-semibold text-zinc-900">{data.label || 'Run Code'}</div>
        </div>
      </div>
      {data.language && (
        <div className="mt-2 text-xs text-zinc-600 bg-zinc-300/50 px-2 py-0.5 rounded-full w-fit">
          {data.language}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-600 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
