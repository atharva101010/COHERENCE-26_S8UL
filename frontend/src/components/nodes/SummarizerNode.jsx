import { Handle, Position } from '@xyflow/react';
import { FileText } from 'lucide-react';

export default function SummarizerNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[180px] shadow-md transition-all
      ${selected ? 'border-rose-500 shadow-rose-200 ring-2 ring-rose-300' : 'border-rose-300'}
      bg-gradient-to-br from-rose-50 to-pink-100`}>
      <Handle type="target" position={Position.Top} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-rose-600 uppercase tracking-wide">Summarizer</div>
          <div className="text-sm font-semibold text-rose-900">{data.label || 'Summarize'}</div>
        </div>
      </div>
      {data.outputLength && (
        <div className="mt-2 text-xs text-rose-600 bg-rose-200/50 px-2 py-0.5 rounded-full w-fit">
          Max {data.outputLength} words
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
