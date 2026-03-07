import { Handle, Position } from '@xyflow/react';
import { Globe } from 'lucide-react';

export default function HttpRequestNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[180px] shadow-md transition-all
      ${selected ? 'border-sky-500 shadow-sky-200 dark:shadow-sky-900/20 ring-2 ring-sky-300' : 'border-sky-300 dark:border-sky-700/50'}
      bg-gradient-to-br from-sky-50 to-cyan-100 dark:from-sky-950/30 dark:to-cyan-900/30`}>
      <Handle type="target" position={Position.Top} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
          <Globe className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wide">HTTP Request</div>
          <div className="text-sm font-semibold text-sky-900 dark:text-sky-100">{data.label || 'HTTP Request'}</div>
        </div>
      </div>
      {data.method && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            data.method === 'GET' ? 'bg-emerald-200 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-200' :
            data.method === 'POST' ? 'bg-blue-200 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200' :
            data.method === 'PUT' ? 'bg-amber-200 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200' :
            'bg-red-200 dark:bg-red-800/40 text-red-800 dark:text-red-200'
          }`}>{data.method}</span>
          <span className="text-[10px] text-sky-600 dark:text-sky-400 truncate max-w-[130px]">{data.url || 'No URL'}</span>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
