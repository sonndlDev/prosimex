import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboard.service';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShoppingCart, CalendarDays, Wrench, Users, TrendingUp, Clock, Bell
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend, loading }) => (
  <Card className="relative overflow-hidden group hover:-translate-y-1 transition-transform duration-200 cursor-default">
    <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-10 ${color}`} />
    <CardContent className="p-6">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            {loading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <span className="text-4xl font-extrabold text-zinc-950">{value ?? 0}</span>
            )}
            {trend && !loading && (
              <span className="flex items-center text-emerald-600 text-xs font-bold gap-0.5">
                <TrendingUp className="w-3 h-3" />{trend}
              </span>
            )}
          </div>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color} bg-opacity-10`}>
          <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: dashboardService.getMetrics,
    staleTime: 60000
  });

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-zinc-950 tracking-tight leading-tight">
            Xin chào, {user?.username} 👋
          </h2>
          <p className="text-zinc-500 font-medium mt-1">Chào mừng bạn quay trở lại. Chúc bạn một ngày làm việc hiệu quả!</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-500 font-medium border-zinc-200 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          {today}
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Đơn hàng" value={metrics?.totalOrders} icon={ShoppingCart} color="bg-blue-500" trend="+12%" loading={isLoading} />
        <StatCard title="Kế hoạch" value={metrics?.activePlans} icon={CalendarDays} color="bg-violet-500" trend="+5%" loading={isLoading} />
        <StatCard title="Hiệu suất máy" value={metrics?.activeMachines ? `${metrics.activeMachines}%` : "0%"} icon={Wrench} color="bg-emerald-500" loading={isLoading} />
        <StatCard title="Nhân viên" value={metrics?.activeUsers} icon={Users} color="bg-orange-500" loading={isLoading} />
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Notifications */}
        <Card className="lg:col-span-3">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-zinc-950">Thông báo hệ thống</h3>
            </div>
            <button className="text-sm text-zinc-400 hover:text-zinc-700 font-medium transition-colors">Xem tất cả</button>
          </div>
          <CardContent className="p-6 space-y-3">
            <Alert className="border-blue-200 bg-blue-50/50">
              <AlertDescription className="text-blue-700 text-sm font-medium">
                Bảo trì hệ thống dự kiến vào Chủ Nhật tuần này lúc 22:00.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-zinc-400 text-center pt-4">Hiện không có thông báo khẩn cấp nào khác.</p>
          </CardContent>
        </Card>

        {/* Machine status */}
        <div className="lg:col-span-2 rounded-xl bg-zinc-950 text-white p-6 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-lg font-bold mb-1">Trạng thái máy móc</h3>
            <p className="text-zinc-400 text-sm font-medium">
              Theo dõi hiệu suất và tình trạng vận hành của các dây chuyền sản xuất.
            </p>
          </div>
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-6xl font-extrabold tracking-tight">98%</div>
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-400 mt-2">Sẵn sàng hoạt động</div>
            </div>
          </div>
          <button className="w-full py-2.5 rounded-lg bg-white text-zinc-950 font-bold text-sm hover:bg-zinc-100 transition-colors">
            Chi tiết vận hành
          </button>
        </div>
      </div>
    </div>
  );
}
