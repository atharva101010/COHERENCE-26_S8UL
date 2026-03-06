import { Handle, Position } from '@xyflow/react';
import { Globe } from 'lucide-react';

export default function HttpRequestNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[180px] shadow-md transition-all
      ${selected ? 'border-sky-500 shadow-sky-200 ring-2 ring-sky-300' : 'border-sky-300'}
      bg-gradient-to-br from-sky-50 to-cyan-100`}>
      <Handle type="target" position={Position.Top} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
          <Globe className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-sky-600 uppercase tracking-wide">HTTP Request</div>
          <div className="text-sm font-semibold text-sky-900">{data.label || 'HTTP Request'}</div>
        </div>
      </div>
      {data.method && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            data.method === 'GET' ? 'bg-emerald-200 text-emerald-800' :
            data.method === 'POST' ? 'bg-blue-200 text-blue-800' :
            data.method === 'PUT' ? 'bg-amber-200 text-amber-800' :
            'bg-red-200 text-red-800'
          }`}>{data.method}</span>
          <span className="text-[10px] text-sky-600 truncate max-w-[130px]">{data.url || 'No URL'}</span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
