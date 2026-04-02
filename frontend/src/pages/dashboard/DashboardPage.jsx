import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboard.service';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingCart, CalendarDays, Wrench, Users, Clock, Bell, X,
  ChevronLeft, ChevronRight, Activity, AlertTriangle, UserCheck, TrendingUp
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────
const actionLabel = (a) => ({ CREATE: 'vừa tạo', DELETE: 'vừa xóa', CLONE: 'vừa sao chép' }[a] ?? 'vừa cập nhật');
const actionDot = (a) => ({ CREATE: 'bg-emerald-500', DELETE: 'bg-rose-500', CLONE: 'bg-violet-400' }[a] ?? 'bg-blue-400');
const actionBadge = (a) => ({
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  CLONE: 'bg-violet-50 text-violet-700 border-violet-200',
}[a] ?? 'bg-blue-50 text-blue-700 border-blue-200');
const actionText = (a) => ({ CREATE: 'Tạo mới', DELETE: 'Xóa', CLONE: 'Sao chép' }[a] ?? 'Cập nhật');

const STATUS_CONFIG = {
  DRAFT: { label: 'Nháp', color: 'bg-zinc-400' },
  PLANNED: { label: 'Kế hoạch', color: 'bg-blue-500' },
  IN_PROGRESS: { label: 'Đang SX', color: 'bg-amber-500' },
  DONE: { label: 'Hoàn thành', color: 'bg-emerald-500' },
  CANCELLED: { label: 'Đã hủy', color: 'bg-rose-400' },
};

// ─── Small reusable components ───────────────────────────
const StatCard = ({ title, value, icon: Icon, colorClass, bgClass, loading, children }) => (
  <Card className="relative overflow-hidden hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">{title}</p>
          {loading
            ? <Skeleton className="h-9 w-16 rounded-md" />
            : <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{value ?? 0}</span>
          }
          {children && <div className="mt-3">{children}</div>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
          <Icon className={`w-5 h-5 ${colorClass}`} strokeWidth={2.2} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SectionCard = ({ icon: Icon, title, action, onAction, children }) => (
  <Card className="shadow-sm">
    <div className="px-6 border-b border-zinc-100 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-bold text-zinc-900 text-sm">{title}</h3>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition-colors border border-zinc-200 hover:border-zinc-300 rounded-lg px-3 py-1.5"
        >
          {action}
        </button>
      )}
    </div>
    <CardContent className="px-6 pt-2 pb-4">{children}</CardContent>
  </Card>
);

const ActivityRow = ({ act }) => (
  <div className="flex items-center gap-3 py-3 border-b border-zinc-100 last:border-0">
    <div className={`w-2 h-2 rounded-full shrink-0 ${actionDot(act.action)}`} />
    <div className="flex-1 min-w-0">
      <p className="text-sm text-zinc-800 leading-snug">
        <span className="font-semibold text-zinc-950">{act.user_name}</span>{' '}
        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${actionBadge(act.action)}`}>
          {actionText(act.action)}
        </span>{' '}
        <span className="text-zinc-500">{act.entity}</span>
        {act.entity_id && <span className="text-zinc-400 text-xs"> #{act.entity_id}</span>}
      </p>
      <p className="text-xs text-zinc-400 mt-0.5">{new Date(act.created_at).toLocaleString('vi-VN')}</p>
    </div>
  </div>
);

// ─── Activities Modal ─────────────────────────────────────
function ActivitiesModal({ open, onClose }) {
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboardActivities', page],
    queryFn: () => dashboardService.getActivities({ page, limit: LIMIT }),
    enabled: open,
    keepPreviousData: true,
  });

  if (!open) return null;
  const totalPages = data?.totalPages ?? 1;

  const pageNums = () => {
    const t = totalPages;
    if (t <= 5) return Array.from({ length: t }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, 4, 5];
    if (page >= t - 2) return [t - 4, t - 3, t - 2, t - 1, t];
    return [page - 2, page - 1, page, page + 1, page + 2];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 flex flex-col" style={{ maxHeight: '88vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base leading-tight">Lịch sử hoạt động</h3>
              {data?.total != null && <p className="text-xs text-zinc-400">{data.total.toLocaleString('vi-VN')} bản ghi</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg mb-2" />)
            : data?.data?.length > 0
              ? data.data.map((act, idx) => <ActivityRow key={act.id ?? idx} act={act} />)
              : <div className="py-16 text-center text-zinc-400 text-sm">Không có hoạt động nào.</div>
          }
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 bg-zinc-50 rounded-b-2xl">
          <p className="text-xs text-zinc-400">Trang {page} / {totalPages}</p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-7 h-7 rounded-md border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-600" />
            </button>
            {pageNums().map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-md text-xs font-semibold transition-colors ${page === p ? 'bg-zinc-900 text-white' : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-7 h-7 rounded-md border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Order Status Mini Bar ────────────────────────────────
function OrderStatusBar({ ordersByStatus, total, loading }) {
  if (loading) return <Skeleton className="h-2 w-full rounded-full mt-1" />;
  if (!ordersByStatus || total === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = ordersByStatus[key] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return <div key={key} title={`${cfg.label}: ${count}`} className={`${cfg.color} transition-all`} style={{ width: `${pct}%` }} />;
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = ordersByStatus[key] || 0;
          if (count === 0) return null;
          return (
            <div key={key} className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.color}`} />
              <span className="text-[10px] text-zinc-500">{cfg.label}: <span className="font-bold text-zinc-700">{count}</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Urgent Orders Panel ──────────────────────────────────
function UrgentOrdersPanel({ orders, loading }) {
  if (loading) return (
    <div className="space-y-3 pt-2">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
    </div>
  );
  if (!orders?.length) return (
    <div className="py-8 text-center text-zinc-400 text-sm">Không có đơn hàng nào sắp đến hạn. 🎉</div>
  );
  return (
    <div className="space-y-0 pt-1">
      {orders.map((o) => {
        const daysLeft = o.days_left;
        const isOverdue = daysLeft < 0;
        const isToday = daysLeft === 0;
        const urgentColor = isOverdue ? 'text-rose-600 bg-rose-50 border-rose-200'
          : isToday ? 'text-orange-600 bg-orange-50 border-orange-200'
            : daysLeft <= 3 ? 'text-amber-600 bg-amber-50 border-amber-200'
              : 'text-zinc-500 bg-zinc-50 border-zinc-200';
        const urgentLabel = isOverdue ? `Quá hạn ${Math.abs(daysLeft)} ngày` : isToday ? 'Hôm nay' : `Còn ${daysLeft} ngày`;
        const statusCfg = STATUS_CONFIG[o.status] || { label: o.status, color: 'bg-zinc-300' };
        return (
          <div key={o.id} className="flex items-center gap-3 py-3 border-b border-zinc-100 last:border-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-zinc-900 truncate">{o.order_code}</span>
                <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${urgentColor}`}>
                  {urgentLabel}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">{o.name} · {o.customer_name}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-2 h-2 rounded-full ${statusCfg.color}`} />
              <span className="text-xs text-zinc-500">{statusCfg.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Production Progress Panel ────────────────────────────
function ProductionProgressPanel({ orders, loading }) {
  if (loading) return (
    <div className="space-y-3 pt-2">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
    </div>
  );
  if (!orders?.length) return (
    <div className="py-8 text-center text-zinc-400 text-sm">Hiện không có đơn hàng nào đang sản xuất.</div>
  );
  return (
    <div className="space-y-0 pt-1">
      {orders.map((o) => {
        const pct = o.completion_pct ?? 0;
        const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-blue-500';
        return (
          <div key={o.id} className="py-3 border-b border-zinc-100 last:border-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="min-w-0">
                <span className="text-sm font-semibold text-zinc-900">{o.order_code}</span>
                <span className="text-xs text-zinc-400 ml-2 truncate">{o.customer_name}</span>
              </div>
              <span className="text-xs font-bold text-zinc-700 shrink-0 ml-2">{pct}%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {parseFloat(o.completed_quantity).toLocaleString('vi-VN')} / {parseFloat(o.total_quantity).toLocaleString('vi-VN')} sản phẩm
              {o.delivery_date && ` · Hạn: ${new Date(o.delivery_date).toLocaleDateString('vi-VN')}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Attendance Panel ─────────────────────────────────────
function AttendancePanel({ data, myAttendance, loading }) {
  const navigate = useNavigate();

  if (loading) return <Skeleton className="h-28 w-full rounded-lg mt-2" />;
  if (!data) return null;

  const { checkedIn, checkedOut, totalWorkers } = data;
  const absentCount = Math.max(0, totalWorkers - checkedIn);
  const pct = totalWorkers > 0 ? Math.round((checkedIn / totalWorkers) * 100) : 0;

  const hasCheckedIn = !!myAttendance;
  const hasCheckedOut = !!(myAttendance?.check_out_time);

  return (
    <div>
      {/* Personal status bar */}
      <div className={`flex items-center justify-between p-3 rounded-xl border ${hasCheckedOut ? 'bg-emerald-50 border-emerald-200' :
        hasCheckedIn ? 'bg-blue-50 border-blue-200' :
          'bg-amber-50 border-amber-200'
        }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${hasCheckedOut ? 'bg-emerald-500' : hasCheckedIn ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'}`} />
          <div>
            {!hasCheckedIn && (
              <p className="text-sm font-semibold text-amber-800">Bạn chưa check-in hôm nay</p>
            )}
            {hasCheckedIn && !hasCheckedOut && (
              <p className="text-sm font-semibold text-blue-800">
                Check-in lúc {new Date(myAttendance.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {hasCheckedOut && (
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Check-in {new Date(myAttendance.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}Check-out {new Date(myAttendance.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-0.5">Hôm nay, {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/attendance')}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${hasCheckedOut ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
            hasCheckedIn ? 'bg-blue-600 text-white hover:bg-blue-700' :
              'bg-amber-500 text-white hover:bg-amber-600'
            }`}
        >
          {hasCheckedOut ? 'Xem chấm công' : hasCheckedIn ? 'Check-out →' : 'Check-in ngay →'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: dashboardService.getMetrics,
    refetchInterval: 15000,
  });

  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
  const urgentCount = metrics?.urgentOrders?.length ?? 0;

  return (
    <div className="space-y-5">
      <ActivitiesModal open={showModal} onClose={() => setShowModal(false)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            Xin chào, {user?.username} 👋
          </h2>
          <p className="text-zinc-500 text-sm mt-0.5">Chào mừng bạn quay trở lại. Chúc bạn một ngày làm việc hiệu quả!</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-500 text-xs font-medium border-zinc-200 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          {today}
        </Badge>
      </div>


      <SectionCard icon={UserCheck} title="Điểm danh hôm nay">
        <AttendancePanel data={metrics?.todayAttendance} myAttendance={metrics?.myAttendance} loading={isLoading} />
      </SectionCard>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Đơn hàng" value={metrics?.totalOrders}
          icon={ShoppingCart} colorClass="text-blue-600" bgClass="bg-blue-50" loading={isLoading}
        >
          <OrderStatusBar ordersByStatus={metrics?.ordersByStatus} total={metrics?.totalOrders} loading={isLoading} />
        </StatCard>

        <StatCard title="Kế hoạch đang chạy" value={metrics?.activePlans} icon={CalendarDays} colorClass="text-violet-600" bgClass="bg-violet-50" loading={isLoading} />
        <StatCard title="Hiệu suất máy" value={metrics?.activeMachines != null ? `${metrics.activeMachines}%` : '0%'} icon={Wrench} colorClass="text-emerald-600" bgClass="bg-emerald-50" loading={isLoading} />
        <StatCard title="Người dùng" value={metrics?.activeUsers} icon={Users} colorClass="text-orange-600" bgClass="bg-orange-50" loading={isLoading} />
      </div>

      {/* Attendance */}

      {/* Row: Urgent orders + Production progress */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard
          icon={AlertTriangle}
          title={`Đơn hàng sắp đến hạn${urgentCount > 0 ? ` (${urgentCount})` : ''}`}
        >
          <UrgentOrdersPanel orders={metrics?.urgentOrders} loading={isLoading} />
        </SectionCard>

        <SectionCard icon={TrendingUp} title="Tiến độ sản xuất (đang chạy)">
          <ProductionProgressPanel orders={metrics?.productionProgress} loading={isLoading} />
        </SectionCard>
      </div> */}

      {/* Activities */}
      <SectionCard icon={Activity} title="Hoạt động mới nhất" action="Xem tất cả" onAction={() => setShowModal(true)}>
        <div className="space-y-0">
          {isLoading
            ? [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-11 w-full rounded-md mb-2" />)
            : metrics?.activities?.length > 0
              ? metrics.activities.map((act, idx) => <ActivityRow key={idx} act={act} />)
              : <p className="text-sm text-zinc-400 text-center py-8">Hiện không có hoạt động nào gần đây.</p>
          }
        </div>
      </SectionCard>
    </div>
  );
}
