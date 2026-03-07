import { Handle, Position } from '@xyflow/react';
import { Bot } from 'lucide-react';

const modelColors = {
  'groq': 'from-orange-500 to-red-500',
  'openai': 'from-emerald-500 to-teal-500',
  'anthropic': 'from-amber-600 to-orange-500',
  'google': 'from-blue-500 to-indigo-500',
};

export default function AIAgentNode({ data, selected }) {
  const provider = data.provider || 'groq';
  const gradient = modelColors[provider] || 'from-violet-500 to-purple-600';

  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[190px] shadow-md transition-all
      ${selected ? 'border-purple-500 shadow-purple-200 dark:shadow-purple-900/20 ring-2 ring-purple-300' : 'border-purple-300 dark:border-purple-700/50'}
      bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950/30 dark:to-indigo-900/30`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">AI Agent</div>
          <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">{data.label || 'AI Agent'}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-medium bg-purple-200/60 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
          {provider.toUpperCase()}
        </span>
        {data.model && (
          <span className="text-[10px] text-purple-500 dark:text-purple-400 truncate max-w-[120px]">{data.model}</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
