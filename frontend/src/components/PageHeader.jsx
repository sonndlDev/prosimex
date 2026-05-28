/**
 * PageHeader — shared page title + toolbar used by all pages
 *
 * Usage:
 *   <PageHeader
 *     title="Công nhân"
 *     subtitle="Quản lý danh sách công nhân"
 *     icon={Users}
 *     actions={<button className="btn btn-primary"><Plus />Thêm mới</button>}
 *   />
 */
export default function PageHeader({ title, subtitle, icon: Icon, actions, badge }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 16, gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 7, flexShrink: 0,
            background: 'rgb(var(--c-blue) / 0.12)',
            border: '1px solid rgb(var(--c-blue) / 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon style={{ width: 15, height: 15, color: 'rgb(var(--c-blue))' }} strokeWidth={1.8} />
          </div>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: 'rgb(var(--c-ink))', letterSpacing: '-0.01em', margin: 0 }}>
              {title}
            </h1>
            {badge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                background: 'rgb(var(--c-blue) / 0.12)', color: 'rgb(var(--c-blue))',
                border: '1px solid rgb(var(--c-blue) / 0.2)',
              }}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ fontSize: 11, color: 'rgb(var(--c-ink-4))', margin: '2px 0 0' }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
