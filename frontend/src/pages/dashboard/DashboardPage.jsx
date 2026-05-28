import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboard.service';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart, CalendarDays, Wrench, Users, Activity,
  UserCheck, ChevronLeft, ChevronRight, X,
  AlertTriangle, Zap, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { DateTime } from 'luxon';

// ── Helpers ───────────────────────────────────────────────
const actionColor = (a) => ({ CREATE: 'var(--c-run)', DELETE: 'var(--c-crit)', CLONE: 'var(--c-done)' }[a] ?? 'var(--c-blue)');
const actionLabel = (a) => ({ CREATE: 'Tạo', DELETE: 'Xóa', CLONE: 'Sao chép' }[a] ?? 'Cập nhật');
const entityLabel = (e) => ({
  ProductionPlan: 'Kế hoạch SX', Order: 'Đơn hàng', Product: 'Sản phẩm',
  Machine: 'Máy móc', Worker: 'Công nhân', User: 'Người dùng',
  Factory: 'Nhà máy', Customer: 'Khách hàng', DailyProductionTicket: 'Phiếu SX',
  OutsourcingTicket: 'Phiếu gia công', ProductGroupOperation: 'Công đoạn',
}[e] ?? e);

const STATUS_CFG = {
  DRAFT:       { label: 'Nháp',       cls: 'status-idle' },
  PLANNED:     { label: 'Kế hoạch',   cls: 'status-idle' },
  IN_PROGRESS: { label: 'Đang SX',    cls: 'status-run' },
  DONE:        { label: 'Hoàn thành', cls: 'status-done' },
  CANCELLED:   { label: 'Đã hủy',     cls: 'status-cancel' },
};

const STATUS_COLORS = {
  DRAFT: 'var(--c-idle)', PLANNED: 'var(--c-blue)',
  IN_PROGRESS: 'var(--c-warn)', DONE: 'var(--c-run)', CANCELLED: 'var(--c-crit)',
};

// ── KPI Card ──────────────────────────────────────────────
function KpiCard({ label, value, sub, accent = 'blue', icon: Icon, loading, trend, children }) {
  const colorMap = {
    blue: 'var(--c-blue)', green: 'var(--c-run)',
    amber: 'var(--c-warn)', red: 'var(--c-crit)', purple: 'var(--c-done)',
  };
  const col = colorMap[accent] ?? colorMap.blue;

  return (
    <div className={`kpi-card accent-${accent}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgb(var(--c-ink-4))', marginBottom: 8 }}>
            {label}
          </p>
          {loading
            ? <div className="skel" style={{ height: 28, width: 64 }} />
            : <span style={{ fontSize: 24, fontWeight: 700, color: 'rgb(var(--c-ink))', letterSpacing: '-0.03em', lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                {value ?? 0}
              </span>
          }
          {sub && !loading && (
            <p style={{ fontSize: 11, color: 'rgb(var(--c-ink-3))', marginTop: 6 }}>{sub}</p>
          )}
          {trend != null && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
              {trend > 0
                ? <TrendingUp style={{ width: 11, height: 11, color: 'rgb(var(--c-run))' }} />
                : trend < 0
                ? <TrendingDown style={{ width: 11, height: 11, color: 'rgb(var(--c-crit))' }} />
                : <Minus style={{ width: 11, height: 11, color: 'rgb(var(--c-ink-4))' }} />
              }
              <span style={{ fontSize: 10, color: trend > 0 ? 'rgb(var(--c-run))' : trend < 0 ? 'rgb(var(--c-crit))' : 'rgb(var(--c-ink-4))' }}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </div>
          )}
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: `${col.replace('var(', 'rgb(var(').replace(')', ') / 0.12)')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 16, height: 16, color: col }} strokeWidth={2} />
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────
function Section({ title, icon: Icon, action, onAction, children, live }) {
  return (
    <div style={{ background: 'rgb(var(--c-s1))', border: '1px solid rgb(var(--c-line))', borderRadius: 8, overflow: 'hidden' }}>
      <div className="section-header">
        <div className="section-title">
          {live && <span className="live-dot" />}
          <Icon style={{ width: 13, height: 13, color: 'rgb(var(--c-ink-3))' }} strokeWidth={1.8} />
          <span>{title}</span>
        </div>
        {action && (
          <button onClick={onAction} style={{ fontSize: 11, color: 'rgb(var(--c-blue))', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            {action}
          </button>
        )}
      </div>
      <div style={{ padding: '4px 16px 12px' }}>{children}</div>
    </div>
  );
}

// ── Activity Row ──────────────────────────────────────────
function ActivityRow({ act }) {
  const col = `rgb(var(--c-${act.action === 'CREATE' ? 'run' : act.action === 'DELETE' ? 'crit' : 'done'}))`;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid rgb(var(--c-line))' }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 5 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, color: 'rgb(var(--c-ink-2))', lineHeight: 1.4 }}>
          <strong style={{ color: 'rgb(var(--c-ink))' }}>{act.user_name}</strong>{' '}
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: `${col}18`, color: col, border: `1px solid ${col}30` }}>
            {actionLabel(act.action)}
          </span>{' '}
          <span style={{ color: 'rgb(var(--c-ink-3))' }}>{entityLabel(act.entity)}</span>
        </p>
        <p style={{ fontSize: 10, color: 'rgb(var(--c-ink-4))', marginTop: 2 }}>
          {DateTime.fromISO(act.created_at).setLocale('vi-VN').toFormat('dd/MM HH:mm:ss')}
        </p>
      </div>
    </div>
  );
}

// ── Activities Modal ──────────────────────────────────────
function ActivitiesModal({ open, onClose }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboardActivities', page],
    queryFn: () => dashboardService.getActivities({ page, limit: 15 }),
    enabled: open,
    keepPreviousData: true,
  });
  if (!open) return null;
  const totalPages = data?.totalPages ?? 1;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'rgb(var(--c-s1))', border: '1px solid rgb(var(--c-line-2))',
        borderRadius: 10, width: '100%', maxWidth: 540, margin: '0 16px',
        display: 'flex', flexDirection: 'column', maxHeight: '88vh',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div className="section-header" style={{ borderRadius: '10px 10px 0 0' }}>
          <div className="section-title">
            <Activity style={{ width: 13, height: 13 }} />
            <span>Lịch sử hoạt động</span>
            {data?.total != null && (
              <span style={{ fontSize: 10, color: 'rgb(var(--c-ink-4))' }}>{data.total.toLocaleString('vi-VN')} bản ghi</span>
            )}
          </div>
          <button onClick={onClose} style={{ padding: 4, borderRadius: 4, color: 'rgb(var(--c-ink-3))', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="skel" style={{ height: 40, margin: '6px 0' }} />)
            : data?.data?.map((act, i) => <ActivityRow key={act.id ?? i} act={act} />)
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid rgb(var(--c-line))', background: 'rgb(var(--c-s2))' }}>
          <span style={{ fontSize: 11, color: 'rgb(var(--c-ink-4))' }}>Trang {page} / {totalPages}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { Icon: ChevronLeft,  disabled: page === 1,          onClick: () => setPage(p => Math.max(1, p - 1)) },
              { Icon: ChevronRight, disabled: page >= totalPages,  onClick: () => setPage(p => Math.min(totalPages, p + 1)) },
            ].map(({ Icon, disabled, onClick }, i) => (
              <button key={i} onClick={onClick} disabled={disabled}
                style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid rgb(var(--c-line-2))', background: 'rgb(var(--c-s3))', color: 'rgb(var(--c-ink-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
                <Icon style={{ width: 12, height: 12 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Order Status Bar ──────────────────────────────────────
function OrderStatusBar({ ordersByStatus, total, loading }) {
  if (loading) return <div className="skel" style={{ height: 4, marginTop: 10 }} />;
  if (!ordersByStatus || !total) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', height: 4, borderRadius: 99, overflow: 'hidden', gap: 1 }}>
        {Object.entries(STATUS_CFG).map(([key]) => {
          const pct = total > 0 ? ((ordersByStatus[key] || 0) / total) * 100 : 0;
          if (!pct) return null;
          return <div key={key} style={{ background: `rgb(${STATUS_COLORS[key]})`, width: `${pct}%` }} />;
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', marginTop: 6 }}>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const count = ordersByStatus[key] || 0;
          if (!count) return null;
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: `rgb(${STATUS_COLORS[key]})` }} />
              <span style={{ fontSize: 10, color: 'rgb(var(--c-ink-4))' }}>{cfg.label}: <strong style={{ color: 'rgb(var(--c-ink-3))' }}>{count}</strong></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Attendance Panel ──────────────────────────────────────
function AttendancePanel({ myAttendance, loading }) {
  const navigate = useNavigate();
  if (loading) return <div className="skel" style={{ height: 52, marginTop: 8 }} />;
  const hasIn  = !!myAttendance;
  const hasOut = !!(myAttendance?.check_out_time);
  const stateVar = hasOut ? 'run' : hasIn ? 'blue' : 'warn';
  const col = `var(--c-${stateVar})`;
  const label = hasOut
    ? `Check-in ${DateTime.fromISO(myAttendance.check_in_time).toFormat('HH:mm')} · Check-out ${DateTime.fromISO(myAttendance.check_out_time).toFormat('HH:mm')}`
    : hasIn ? `Check-in lúc ${DateTime.fromISO(myAttendance.check_in_time).toFormat('HH:mm')}`
    : 'Chưa check-in hôm nay';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 12px', borderRadius: 6, marginTop: 8,
      background: `rgb(${col.replace('var(', '').replace(')', '')} / 0.08)`,
      border: `1px solid rgb(${col.replace('var(', '').replace(')', '')} / 0.2)`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: `rgb(${col.replace('var(', '').replace(')', '')})`, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'rgb(var(--c-ink))' }}>{label}</p>
          <p style={{ fontSize: 10, color: 'rgb(var(--c-ink-4))', marginTop: 1 }}>
            {DateTime.now().setLocale('vi-VN').toFormat('cccc, dd/MM/yyyy')}
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate('/attendance')}
        style={{
          fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 5,
          background: `rgb(${col.replace('var(', '').replace(')', '')})`,
          color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0,
        }}
      >
        {hasOut ? 'Xem' : hasIn ? 'Check-out →' : 'Check-in →'}
      </button>
    </div>
  );
}

// ── Quick Stats ───────────────────────────────────────────
function QuickStats({ metrics, loading }) {
  const items = [
    { label: 'Phiếu SX chờ duyệt', value: metrics?.pendingTickets,              color: 'var(--c-warn)', path: '/daily-tickets/approval' },
    { label: 'Đơn hàng đang SX',   value: metrics?.ordersByStatus?.IN_PROGRESS, color: 'var(--c-run)',  path: '/orders' },
    { label: 'Đơn hàng hoàn thành',value: metrics?.ordersByStatus?.DONE,        color: 'var(--c-done)', path: '/orders' },
    { label: 'Kế hoạch đang chạy', value: metrics?.activePlans,                 color: 'var(--c-blue)', path: '/planning' },
  ];
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 4 }}>
      {items.map(item => (
        <button
          key={item.label}
          onClick={() => navigate(item.path)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: '1px solid rgb(var(--c-line))',
            background: 'none', border: 'none', borderBottom: '1px solid rgb(var(--c-line))',
            cursor: 'pointer', width: '100%', transition: 'background 0.08s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--c-s2))'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <span style={{ fontSize: 12, color: 'rgb(var(--c-ink-3))' }}>{item.label}</span>
          {loading
            ? <div className="skel" style={{ height: 16, width: 32 }} />
            : <span style={{ fontSize: 15, fontWeight: 700, color: `rgb(${item.color.replace('var(', '').replace(')', '')})`, fontFamily: 'JetBrains Mono, monospace' }}>
                {item.value ?? '—'}
              </span>
          }
        </button>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: dashboardService.getMetrics,
    refetchInterval: 15000,
  });

  const kpis = [
    {
      label: 'Đơn hàng',
      value: metrics?.totalOrders,
      accent: 'blue',
      icon: ShoppingCart,
      extra: <OrderStatusBar ordersByStatus={metrics?.ordersByStatus} total={metrics?.totalOrders} loading={isLoading} />,
    },
    {
      label: 'Kế hoạch đang chạy',
      value: metrics?.activePlans,
      accent: 'green',
      icon: CalendarDays,
    },
    {
      label: 'Hiệu suất máy',
      value: metrics?.activeMachines != null ? `${metrics.activeMachines}%` : '0%',
      accent: 'amber',
      icon: Wrench,
    },
    {
      label: 'Người dùng',
      value: metrics?.activeUsers,
      accent: 'purple',
      icon: Users,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ActivitiesModal open={showModal} onClose={() => setShowModal(false)} />

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: 'rgb(var(--c-ink))', letterSpacing: '-0.02em' }}>
            Tổng quan vận hành
          </h1>
          <p style={{ fontSize: 12, color: 'rgb(var(--c-ink-4))', marginTop: 2 }}>
            Xin chào, <strong style={{ color: 'rgb(var(--c-ink-3))' }}>{user?.username}</strong>
            {' · '}{DateTime.now().setLocale('vi-VN').toFormat('cccc, dd MMMM yyyy')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" />
          <span style={{ fontSize: 11, color: 'rgb(var(--c-ink-4))' }}>Cập nhật mỗi 15 giây</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {kpis.map(k => (
          <KpiCard key={k.label} label={k.label} value={k.value} accent={k.accent} icon={k.icon} loading={isLoading}>
            {k.extra}
          </KpiCard>
        ))}
      </div>

      {/* 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Section icon={UserCheck} title="Điểm danh hôm nay">
          <AttendancePanel myAttendance={metrics?.myAttendance} loading={isLoading} />
        </Section>
        <Section icon={Zap} title="Trạng thái nhanh">
          <QuickStats metrics={metrics} loading={isLoading} />
        </Section>
      </div>

      {/* Activity feed */}
      <Section icon={Activity} title="Hoạt động gần đây" action="Xem tất cả" onAction={() => setShowModal(true)} live>
        <div>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skel" style={{ height: 36, margin: '4px 0' }} />)
            : metrics?.activities?.length > 0
              ? metrics.activities.map((act, i) => <ActivityRow key={act.id ?? i} act={act} />)
              : <p style={{ textAlign: 'center', color: 'rgb(var(--c-ink-4))', padding: '24px 0', fontSize: 12 }}>Không có hoạt động nào gần đây.</p>
          }
        </div>
      </Section>
    </div>
  );
}
