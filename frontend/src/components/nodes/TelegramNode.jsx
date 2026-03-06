import { Handle, Position } from '@xyflow/react';
import { Send } from 'lucide-react';
import PropTypes from 'prop-types';

export default function TelegramNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[170px] shadow-md transition-all
      ${selected ? 'border-sky-500 shadow-sky-200 ring-2 ring-sky-300' : 'border-sky-300'}
      bg-gradient-to-br from-sky-50 to-blue-100`}>
      <Handle type="target" position={Position.Top} className="!bg-sky-600 !w-3 !h-3 !border-2 !border-white" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
          <Send className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-sky-600 uppercase tracking-wide">Telegram</div>
          <div className="text-sm font-semibold text-sky-900">{data.label || 'Telegram Message'}</div>
        </div>
      </div>
      {data.chatId && (
        <div className="mt-2 text-xs text-sky-700 bg-sky-200/50 px-2 py-0.5 rounded-full w-fit truncate max-w-[160px]">
          Chat: {data.chatId}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-sky-600 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}

TelegramNode.propTypes = {
  data: PropTypes.shape({
    label: PropTypes.string,
    chatId: PropTypes.string,
  }),
  selected: PropTypes.bool,
};
