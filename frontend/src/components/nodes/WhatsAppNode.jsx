import { Handle, Position } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import PropTypes from 'prop-types';

export default function WhatsAppNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[170px] shadow-md transition-all
      ${selected ? 'border-emerald-500 shadow-emerald-200 ring-2 ring-emerald-300' : 'border-emerald-300'}
      bg-gradient-to-br from-emerald-50 to-green-100`}>
      <Handle type="target" position={Position.Top} className="!bg-emerald-600 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wide">WhatsApp</div>
          <div className="text-sm font-semibold text-emerald-900">{data.label || 'WhatsApp Message'}</div>
        </div>
      </div>
      {data.phoneNumber && (
        <div className="mt-2 text-xs text-emerald-700 bg-emerald-200/50 px-2 py-0.5 rounded-full w-fit truncate max-w-[160px]">
          {data.phoneNumber}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-600 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}

WhatsAppNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    phoneNumber: PropTypes.string,
  }),
  selected: PropTypes.bool,
};
