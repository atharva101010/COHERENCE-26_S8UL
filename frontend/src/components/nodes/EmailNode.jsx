import { Handle, Position } from '@xyflow/react';
import { Mail } from 'lucide-react';

export default function EmailNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[180px] shadow-md transition-all
      ${selected ? 'border-blue-500 shadow-blue-200 ring-2 ring-blue-300' : 'border-blue-300'}
      bg-gradient-to-br from-blue-50 to-sky-100`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Email</div>
          <div className="text-sm font-semibold text-blue-900">{data.label || 'Send Email'}</div>
        </div>
      </div>
      {data.subject && (
        <div className="mt-2 text-xs text-blue-600 bg-blue-200/50 px-2 py-0.5 rounded-full w-fit truncate max-w-[200px]">
          {data.subject}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
