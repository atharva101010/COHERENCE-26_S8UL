import { Handle, Position } from '@xyflow/react';
import PropTypes from 'prop-types';
import { UserCheck } from 'lucide-react';

export default function UpdateLeadNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[170px] shadow-md transition-all
      ${selected ? 'border-teal-500 shadow-teal-200 dark:shadow-teal-900/20 ring-2 ring-teal-300' : 'border-teal-300 dark:border-teal-700/50'}
      bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-950/30 dark:to-cyan-900/30`}>
      <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
          <UserCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">Update Lead</div>
          <div className="text-sm font-semibold text-teal-900 dark:text-teal-100">{data.label || 'Update Lead'}</div>
        </div>
      </div>
      {data.status && (
        <div className="mt-2 text-xs text-teal-700 dark:text-teal-300 bg-teal-200/50 dark:bg-teal-800/40 px-2 py-0.5 rounded-full w-fit">
          → {data.status}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}

UpdateLeadNode.propTypes = {
  data: PropTypes.object,
  selected: PropTypes.bool,
};
