import { Handle, Position } from '@xyflow/react';
import PropTypes from 'prop-types';
import { Split } from 'lucide-react';

export default function SplitNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[160px] shadow-md transition-all
      ${selected ? 'border-fuchsia-500 shadow-fuchsia-200 dark:shadow-fuchsia-900/20 ring-2 ring-fuchsia-300' : 'border-fuchsia-300 dark:border-fuchsia-700/50'}
      bg-gradient-to-br from-fuchsia-50 to-pink-100 dark:from-fuchsia-950/30 dark:to-pink-900/30`}>
      <Handle type="target" position={Position.Top} className="!bg-fuchsia-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-fuchsia-500 flex items-center justify-center">
          <Split className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-wide">Split</div>
          <div className="text-sm font-semibold text-fuchsia-900 dark:text-fuchsia-100">{data.label || 'Split'}</div>
        </div>
      </div>
      <div className="flex justify-between mt-2 px-1">
        <span className="text-[10px] font-medium text-fuchsia-400 dark:text-fuchsia-500">Out A</span>
        <span className="text-[10px] font-medium text-fuchsia-400 dark:text-fuchsia-500">Out B</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="out-a" className="!bg-fuchsia-500 !w-3 !h-3 !border-2 !border-white !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="out-b" className="!bg-fuchsia-500 !w-3 !h-3 !border-2 !border-white !left-[70%]" />
    </div>
  );
}

SplitNode.propTypes = {
  data: PropTypes.object,
  selected: PropTypes.bool,
};
