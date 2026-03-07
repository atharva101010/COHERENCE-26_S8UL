import { Handle, Position } from '@xyflow/react';
import { CalendarClock } from 'lucide-react';

export default function ScheduleNode({ data, selected }) {
  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[170px] shadow-md transition-all
      ${selected ? 'border-cyan-500 shadow-cyan-200 dark:shadow-cyan-900/20 ring-2 ring-cyan-300' : 'border-cyan-300 dark:border-cyan-700/50'}
      bg-gradient-to-br from-cyan-50 to-sky-100 dark:from-cyan-950/30 dark:to-sky-900/30`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
          <CalendarClock className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">Schedule</div>
          <div className="text-sm font-semibold text-cyan-900 dark:text-cyan-100">{data.label || 'Schedule Trigger'}</div>
        </div>
      </div>
      {data.cron && (
        <div className="mt-2 text-xs text-cyan-600 dark:text-cyan-400 bg-cyan-200/50 dark:bg-cyan-800/40 px-2 py-0.5 rounded-full w-fit font-mono">
          {data.cron}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  );
}
