import React, { useState } from 'react';
import { Pencil, Trash2, Plus, Search, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

function SearchBar({ onSearch, initial = "" }) {
  const [val, setVal] = React.useState(initial);
  return (
    <form onSubmit={e => { e.preventDefault(); onSearch(val); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative' }}>
        <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, color: 'rgb(var(--c-ink-4))' }} />
        <input
          value={val} onChange={e => setVal(e.target.value)}
          placeholder="Tìm kiếm..."
          className="field"
          style={{ paddingLeft: 26, width: 200, height: 30 }}
        />
      </div>
      <button type="submit" style={{ height: 30, padding: '0 12px', background: 'rgb(var(--c-blue))', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--c-blue-dim))'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgb(var(--c-blue))'}
      >Lọc</button>
      {val && (
        <button type="button" onClick={() => { setVal(""); onSearch(""); }}
          style={{ height: 30, width: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgb(var(--c-s2))', border: '1px solid rgb(var(--c-line-2))', borderRadius: 5, cursor: 'pointer', color: 'rgb(var(--c-ink-4))' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--c-crit))'; e.currentTarget.style.borderColor = 'rgb(var(--c-crit) / 0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-ink-4))'; e.currentTarget.style.borderColor = 'rgb(var(--c-line-2))'; }}
        >
          <RotateCcw style={{ width: 11, height: 11 }} />
        </button>
      )}
    </form>
  );
}

export default function GenericTable({
  title, data = [], columns = [], isLoading, error,
  onAdd, onEdit, onDelete, onBulkDelete,
  isServerSide = false, totalItems = 0, page = 1, pageSize = 10,
  onPageChange, onPageSizeChange, onSearchChange, renderActions,
  maxHeight = "calc(100vh - 280px)",
  selectedRows, onSelectionChange, freezeFirstCols = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSelected, setInternalSelected] = useState([]);
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(10);

  const isControlled = selectedRows !== undefined && onSelectionChange !== undefined;
  const selected = isControlled ? selectedRows : internalSelected;
  const setSelected = v => isControlled ? onSelectionChange(typeof v === 'function' ? v(selected) : v) : setInternalSelected(v);

  const filtered = isServerSide ? data : (data?.filter(row =>
    Object.values(row).some(v => String(v ?? '').toLowerCase().includes(searchTerm.toLowerCase()))
  ) ?? []);

  const effPage     = isServerSide ? page : clientPage;
  const effPageSize = isServerSide ? pageSize : clientPageSize;
  const effTotal    = isServerSide ? totalItems : filtered.length;
  const totalPages  = Math.ceil(effTotal / effPageSize);
  const startIdx    = (effPage - 1) * effPageSize;
  const rows        = isServerSide ? data : filtered.slice(startIdx, startIdx + effPageSize);

  const allSel  = rows.length > 0 && rows.every(r => selected.includes(r.id));
  const someSel = rows.some(r => selected.includes(r.id)) && !allSel;

  const handleSelectAll = e => {
    const ids = rows.map(r => r.id);
    setSelected(prev => e.target.checked ? [...new Set([...prev, ...ids])] : prev.filter(id => !ids.includes(id)));
  };
  const handleSelect = (e, id) => {
    e.stopPropagation();
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleSearch = v => { setSearchTerm(v); if (isServerSide) onSearchChange?.(v); else setClientPage(1); };
  const handlePage = p => isServerSide ? onPageChange?.(p) : setClientPage(p);
  const handlePageSize = s => { if (isServerSide) onPageSizeChange?.(s); else { setClientPageSize(s); setClientPage(1); } };

  if (error) return (
    <div style={{ padding: '10px 14px', background: 'rgb(var(--c-crit-bg))', border: '1px solid rgb(var(--c-crit) / 0.3)', borderRadius: 6, color: 'rgb(var(--c-crit))', fontSize: 13 }}>
      ⚠ {error.message || 'Lỗi khi tải dữ liệu'}
    </div>
  );

  const S = {
    headBg: 'rgb(var(--c-s2))',
    rowBg:  'rgb(var(--c-s1))',
    rowHov: 'rgb(var(--c-s3))',
    rowSel: 'rgb(var(--c-blue) / 0.08)',
    border: 'rgb(var(--c-line))',
    borderS:'rgb(var(--c-line-2))',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          {typeof title === 'string'
            ? <h2 style={{ fontSize: 14, fontWeight: 600, color: 'rgb(var(--c-ink))' }}>{title}</h2>
            : title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {(onSearchChange !== undefined || !isServerSide) && <SearchBar onSearch={handleSearch} initial={searchTerm} />}
          {onBulkDelete && selected.length > 0 && (
            <button
              onClick={() => { onBulkDelete(selected); setSelected([]); }}
              style={{ height: 30, padding: '0 12px', background: 'rgb(var(--c-crit-bg))', color: 'rgb(var(--c-crit))', border: '1px solid rgb(var(--c-crit) / 0.3)', borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Trash2 style={{ width: 11, height: 11 }} /> Xóa {selected.length}
            </button>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              style={{ height: 30, padding: '0 14px', background: 'rgb(var(--c-blue))', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgb(var(--c-blue-dim))'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgb(var(--c-blue))'}
            >
              <Plus style={{ width: 12, height: 12 }} /> Thêm mới
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: S.rowBg, border: `1px solid ${S.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight }}>
          <table className="mes-table" style={{ borderCollapse: freezeFirstCols ? 'separate' : 'collapse', borderSpacing: 0 }}>
            <thead>
              <tr>
                {onBulkDelete && (
                  <th style={{ width: 40, textAlign: 'center', background: S.headBg, ...(freezeFirstCols ? { position: 'sticky', left: 0, zIndex: 30, borderRight: `1px solid ${S.border}` } : {}) }}>
                    <input type="checkbox" checked={allSel} ref={el => el && (el.indeterminate = someSel)} onChange={handleSelectAll}
                      style={{ width: 12, height: 12, cursor: 'pointer', accentColor: 'rgb(var(--c-blue))' }} />
                  </th>
                )}
                <th style={{ width: 44, textAlign: 'center', background: S.headBg, ...(freezeFirstCols ? { position: 'sticky', left: onBulkDelete ? 40 : 0, zIndex: 30, borderRight: `1px solid ${S.border}` } : {}) }}>
                  #
                </th>
                {columns.map(col => (
                  <th key={col.id} style={{
                    background: S.headBg,
                    textAlign: col.align || 'left',
                    width: col.width || (col.minWidth ? `${col.minWidth}px` : 'auto'),
                    minWidth: col.minWidth ? `${col.minWidth}px` : undefined,
                    ...(col.isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 30, borderRight: `1px solid ${S.border}` } : {}),
                  }}>
                    {col.label}
                  </th>
                ))}
                {(onEdit || onDelete || renderActions) && (
                  <th style={{ width: 80, textAlign: 'center', background: S.headBg }}>Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${S.border}` }}>
                    {Array.from({ length: (onBulkDelete ? 1 : 0) + 1 + columns.length + (onEdit || onDelete ? 1 : 0) }).map((_, j) => (
                      <td key={j} style={{ padding: '10px 14px' }}>
                        <div className="skel" style={{ height: 12 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (onBulkDelete ? 3 : 2)} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Search style={{ width: 20, height: 20, color: 'rgb(var(--c-ink-4))' }} />
                      <span style={{ fontSize: 12, color: 'rgb(var(--c-ink-4))' }}>Không tìm thấy dữ liệu</span>
                    </div>
                  </td>
                </tr>
              ) : rows.map((row, idx) => {
                const isSel = selected.includes(row.id);
                return (
                  <tr key={row.id ?? idx}
                    style={{ borderBottom: `1px solid ${S.border}`, background: isSel ? S.rowSel : S.rowBg, transition: 'background 0.08s' }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = S.rowHov; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSel ? S.rowSel : S.rowBg; }}
                  >
                    {onBulkDelete && (
                      <td style={{ padding: '0 14px', textAlign: 'center', background: isSel ? S.rowSel : S.rowBg, ...(freezeFirstCols ? { position: 'sticky', left: 0, zIndex: 20, borderRight: `1px solid ${S.border}` } : {}) }}>
                        <input type="checkbox" checked={isSel} onChange={e => handleSelect(e, row.id)}
                          style={{ width: 12, height: 12, cursor: 'pointer', accentColor: 'rgb(var(--c-blue))' }} />
                      </td>
                    )}
                    <td style={{ padding: '9px 14px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'rgb(var(--c-ink-4))', fontFamily: 'JetBrains Mono, monospace', background: isSel ? S.rowSel : S.rowBg, ...(freezeFirstCols ? { position: 'sticky', left: onBulkDelete ? 40 : 0, zIndex: 20, borderRight: `1px solid ${S.border}` } : {}) }}>
                      {String(startIdx + idx + 1).padStart(2, '0')}
                    </td>
                    {columns.map(col => (
                      <td key={col.id} className={col.className} style={{
                        padding: '9px 14px',
                        textAlign: col.align || 'left',
                        color: 'rgb(var(--c-ink-2))',
                        borderRight: `1px solid ${S.border}`,
                        background: col.isSticky ? (isSel ? S.rowSel : S.rowBg) : undefined,
                        width: col.width || (col.minWidth ? `${col.minWidth}px` : 'auto'),
                        minWidth: col.minWidth ? `${col.minWidth}px` : undefined,
                        ...(col.isSticky ? { position: 'sticky', left: col.stickyLeft, zIndex: 20 } : {}),
                      }}>
                        {col.format ? col.format(row[col.id], row) : (row[col.id] ?? '—')}
                      </td>
                    ))}
                    {(onEdit || onDelete || renderActions) && (
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                          {renderActions ? renderActions(row) : (
                            <>
                              {onEdit && (
                                <button onClick={e => { e.stopPropagation(); onEdit(row); }}
                                  style={{ padding: 5, borderRadius: 4, color: 'rgb(var(--c-ink-4))', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.1s' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--c-blue))'; e.currentTarget.style.background = 'rgb(var(--c-blue) / 0.1)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-ink-4))'; e.currentTarget.style.background = 'none'; }}
                                  title="Chỉnh sửa"
                                >
                                  <Pencil style={{ width: 12, height: 12 }} />
                                </button>
                              )}
                              {onDelete && (
                                <button onClick={e => { e.stopPropagation(); onDelete(row); }}
                                  style={{ padding: 5, borderRadius: 4, color: 'rgb(var(--c-ink-4))', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.1s' }}
                                  onMouseEnter={e => { e.currentTarget.style.color = 'rgb(var(--c-crit))'; e.currentTarget.style.background = 'rgb(var(--c-crit-bg))'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = 'rgb(var(--c-ink-4))'; e.currentTarget.style.background = 'none'; }}
                                  title="Xóa"
                                >
                                  <Trash2 style={{ width: 12, height: 12 }} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '8px 16px', borderTop: `1px solid ${S.border}`, background: S.headBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 11, color: 'rgb(var(--c-ink-4))' }}>
              Tổng: <strong style={{ color: 'rgb(var(--c-ink-3))' }}>{effTotal}</strong> bản ghi
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'rgb(var(--c-ink-4))' }}>Hiển thị</span>
              <select value={effPageSize} onChange={e => handlePageSize(+e.target.value)}
                style={{ height: 26, padding: '0 6px', background: 'rgb(var(--c-s3))', border: `1px solid ${S.borderS}`, borderRadius: 4, fontSize: 11, color: 'rgb(var(--c-ink-2))', cursor: 'pointer', outline: 'none' }}>
                {[5, 10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgb(var(--c-ink-4))' }}>
              Trang <strong style={{ color: 'rgb(var(--c-ink-3))' }}>{effPage}</strong> / {totalPages || 1}
            </span>
            <div style={{ display: 'flex', gap: 3 }}>
              {[
                { Icon: ChevronLeft, disabled: effPage === 1, onClick: () => handlePage(effPage - 1) },
                { Icon: ChevronRight, disabled: effPage >= totalPages, onClick: () => handlePage(effPage + 1) },
              ].map(({ Icon, disabled, onClick }, i) => (
                <button key={i} onClick={onClick} disabled={disabled}
                  style={{ width: 26, height: 26, borderRadius: 4, border: `1px solid ${S.borderS}`, background: disabled ? 'transparent' : 'rgb(var(--c-s3))', color: disabled ? 'rgb(var(--c-ink-4))' : 'rgb(var(--c-ink-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
                  onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = 'rgb(var(--c-blue))'; }}
                  onMouseLeave={e => { if (!disabled) e.currentTarget.style.borderColor = S.borderS; }}
                >
                  <Icon style={{ width: 12, height: 12 }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
