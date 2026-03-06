import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import PropTypes from 'prop-types';

export default function StartNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[160px] shadow-md transition-all
      ${selected ? 'border-emerald-500 shadow-emerald-200 ring-2 ring-emerald-300' : 'border-emerald-300'}
      bg-gradient-to-br from-emerald-50 to-emerald-100`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Play className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Start</div>
          <div className="text-sm font-semibold text-emerald-900">{data.label || 'Start'}</div>
        </div>
      </div>
      {data.trigger && (
        <div className="mt-2 text-xs text-emerald-600 bg-emerald-200/50 px-2 py-0.5 rounded-full w-fit">
          Trigger: {data.trigger}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}

StartNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    trigger: PropTypes.string,
  }),
  selected: PropTypes.bool,
};
