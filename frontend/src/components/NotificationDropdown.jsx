import React from "react";
import { Bell, Check, BellRing } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data;
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id) => {
      await api.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.put("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
    }
  });

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.data || [];

  const handleNotificationClick = (n) => {
    if (!n.is_read) {
      markAsReadMutation.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link + "/approval");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-md text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors outline-none">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 px-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 hover:bg-red-600 text-[10px] text-white border-2 border-white rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-2xl rounded-xl border-zinc-100 overflow-hidden mr-4" align="end">
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-bold text-zinc-950">Thông báo</h4>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="h-7 px-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            >
              <Check className="w-3 h-3 mr-1" /> Đã đọc tất cả
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-zinc-400 font-bold">Đang tải...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-400 font-bold">Không có thông báo nào</div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 border-b border-zinc-50 cursor-pointer transition-colors hover:bg-zinc-50 flex flex-col gap-1 ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                >
                  <p className={`text-xs ${!n.is_read ? 'font-bold text-zinc-900' : 'text-zinc-600'}`}>
                    {n.message}
                  </p>
                  <span className="text-[10px] font-bold text-zinc-400">
                    {DateTime.fromISO(n.created_at).toRelative({ locale: 'vi' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
