import { Handle, Position } from '@xyflow/react';
import { Hash } from 'lucide-react';
import PropTypes from 'prop-types';

export default function DiscordNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[170px] shadow-md transition-all
      ${selected ? 'border-indigo-500 shadow-indigo-200 dark:shadow-indigo-900/20 ring-2 ring-indigo-300' : 'border-indigo-300 dark:border-indigo-700/50'}
      bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-950/30 dark:to-violet-900/30`}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-600 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Hash className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Discord</div>
          <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">{data.label || 'Discord Message'}</div>
        </div>
      </div>
      {data.webhookUrl && (
        <div className="mt-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-200/50 dark:bg-indigo-800/40 px-2 py-0.5 rounded-full w-fit truncate max-w-[160px]">
          Webhook configured
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-600 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}

DiscordNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    webhookUrl: PropTypes.string,
  }),
  selected: PropTypes.bool,
};
