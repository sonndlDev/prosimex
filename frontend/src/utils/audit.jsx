import { DateTime } from 'luxon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { History, User, Clock } from 'lucide-react';

export const getAuditColumn = () => ({
  id: 'audit_info',
  label: 'Lịch sử',
  minWidth: 160,
  format: (_, row) => {
    const createdTime = row.created_time || row.created_at;
    const modifiedTime = row.modified_time || row.updated_at;
    const creator = row.creator_name || row.created_by_username || 'Hệ thống';
    const modifier = row.modifier_name || '---';

    const formatDate = (date) => {
      if (!date) return '---';
      try {
        const dt = DateTime.fromISO(date);
        if (!dt.isValid) return '---';
        return dt.setLocale('vi-VN').toFormat('dd/MM/yyyy HH:mm');
      } catch (e) {
        return '---';
      }
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col gap-0.5 cursor-help group">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                <User className="w-3 h-3 text-zinc-400" />
                <span className="truncate max-w-[120px]">{modifier !== '---' ? modifier : creator}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 tabular-nums">
                <Clock className="w-3 h-3" />
                {formatDate(modifier !== '---' && row.modified_time ? modifiedTime : createdTime)}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="p-3 bg-zinc-950 text-white border-none rounded-xl shadow-2xl">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <History className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-xs uppercase tracking-wider">Chi tiết lịch sử</span>
              </div>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-500 uppercase">Người tạo</p>
                  <p className="text-xs font-bold">{creator}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-500 uppercase">Thời gian tạo</p>
                  <p className="text-xs font-bold tabular-nums">{formatDate(createdTime)}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-500 uppercase">Người sửa cuối</p>
                  <p className="text-xs font-bold">{modifier !== '---' ? modifier : 'Chưa cập nhật'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-500 uppercase">Lần sửa cuối</p>
                  <p className="text-xs font-bold tabular-nums">{formatDate(modifiedTime)}</p>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
});
