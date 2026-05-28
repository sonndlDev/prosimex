import React from "react";
import { Bell, Check, BellRing } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data,
  });
  const markAsRead = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  });
  const markAllRead = useMutation({
    mutationFn: () => api.put("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries(["notifications"]),
  });

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.data || [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative p-1.5 rounded-md text-[rgb(var(--text-3))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))] transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-[rgb(var(--red))] text-white text-[9px] font-bold flex items-center justify-center px-1 border-2 border-[rgb(var(--surface))]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden rounded-lg border border-[rgb(var(--border))] shadow-[0_8px_24px_rgba(0,0,0,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[rgb(var(--surface-2))] border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-2">
            <BellRing className="w-3.5 h-3.5 text-[rgb(var(--blue))]" />
            <span className="text-[13px] font-semibold text-[rgb(var(--text))]">Thông báo</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-semibold bg-[rgb(var(--blue-light))] text-[rgb(var(--blue))] border border-[rgb(var(--blue-border))] rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="flex items-center gap-1 text-[11px] font-medium text-[rgb(var(--blue))] hover:text-[rgb(var(--blue-hover))] transition-colors"
            >
              <Check className="w-3 h-3" /> Đã đọc tất cả
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[300px] overflow-y-auto bg-[rgb(var(--surface))]">
          {isLoading ? (
            <p className="p-4 text-center text-[12px] text-[rgb(var(--text-4))]">Đang tải...</p>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-[rgb(var(--text-4))]">Không có thông báo nào</p>
          ) : notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => { if (!n.is_read) markAsRead.mutate(n.id); if (n.link) navigate(n.link + "/approval"); }}
              className={`px-4 py-3 border-b border-[rgb(var(--border))] cursor-pointer hover:bg-[rgb(var(--surface-2))] transition-colors ${!n.is_read ? 'bg-[rgb(var(--blue-light)/0.5)]' : ''}`}
            >
              <div className="flex items-start gap-2">
                {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--blue))] mt-1.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] leading-snug ${n.is_read ? 'text-[rgb(var(--text-3))]' : 'text-[rgb(var(--text-2))] font-medium'}`}>
                    {n.message}
                  </p>
                  <p className="text-[10px] text-[rgb(var(--text-4))] mt-1">
                    {DateTime.fromISO(n.created_at).toRelative({ locale: 'vi' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
