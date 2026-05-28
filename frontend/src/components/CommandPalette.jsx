import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ArrowRight, Hash } from 'lucide-react';

/**
 * CommandPalette — ⌘K global search & navigation
 *
 * Props:
 *   open       — boolean
 *   onClose    — () => void
 *   items      — Array<{ text, path, icon, group }>
 *   onNavigate — (path: string) => void
 */
export default function CommandPalette({ open, onClose, items = [], onNavigate }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter items by query
  const filtered = query.trim()
    ? items.filter(item =>
        item.text.toLowerCase().includes(query.toLowerCase()) ||
        item.path.toLowerCase().includes(query.toLowerCase()) ||
        item.group?.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Clamp activeIdx when filtered list changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!open) return;
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIdx]) onNavigate(filtered[activeIdx].path);
    }
  }, [open, filtered, activeIdx, onClose, onNavigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx];
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  // Group filtered items by section
  const grouped = filtered.reduce((acc, item) => {
    const g = item.group ?? 'OTHER';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  // Flat index map for keyboard nav
  let flatIdx = 0;

  return (
    <div className="cmd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cmd-box">

        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', borderBottom: '1px solid rgb(var(--c-line))' }}>
          <Search style={{ width: 15, height: 15, color: 'rgb(var(--c-ink-3))', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="cmd-input"
            style={{ padding: '0', border: 'none', borderBottom: 'none', flex: 1 }}
            placeholder="Tìm kiếm trang, tính năng..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="kbd" style={{ flexShrink: 0 }}>ESC</span>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'rgb(var(--c-ink-4))', fontSize: 13 }}>
              Không tìm thấy kết quả cho "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group}>
                {/* Group label */}
                <div style={{ padding: '6px 14px 3px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgb(var(--c-ink-4))' }}>
                  {group}
                </div>
                {groupItems.map((item) => {
                  const idx = flatIdx++;
                  const isActive = idx === activeIdx;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      className={`cmd-item${isActive ? ' active' : ''}`}
                      style={{ width: '100%', border: 'none', textAlign: 'left' }}
                      onClick={() => onNavigate(item.path)}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: isActive ? 'rgb(var(--c-blue) / 0.15)' : 'rgb(var(--c-s3))',
                        border: `1px solid ${isActive ? 'rgb(var(--c-blue) / 0.3)' : 'rgb(var(--c-line-2))'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.1s',
                      }}>
                        {Icon
                          ? <Icon style={{ width: 13, height: 13, color: isActive ? 'rgb(var(--c-blue))' : 'rgb(var(--c-ink-3))' }} strokeWidth={1.8} />
                          : <Hash style={{ width: 13, height: 13, color: 'rgb(var(--c-ink-3))' }} />
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: isActive ? 'rgb(var(--c-ink))' : 'rgb(var(--c-ink-2))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.text}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgb(var(--c-ink-4))', fontFamily: 'JetBrains Mono, monospace' }}>
                          {item.path}
                        </div>
                      </div>
                      {isActive && (
                        <ArrowRight style={{ width: 13, height: 13, color: 'rgb(var(--c-blue))', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px',
          borderTop: '1px solid rgb(var(--c-line))', background: 'rgb(var(--c-s1))',
          borderRadius: '0 0 10px 10px',
        }}>
          {[
            { keys: ['↑', '↓'], label: 'điều hướng' },
            { keys: ['↵'],      label: 'chọn' },
            { keys: ['ESC'],    label: 'đóng' },
          ].map(({ keys, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {keys.map(k => <span key={k} className="kbd">{k}</span>)}
              <span style={{ fontSize: 10, color: 'rgb(var(--c-ink-4))' }}>{label}</span>
            </div>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgb(var(--c-ink-4))' }}>
            {filtered.length} kết quả
          </span>
        </div>
      </div>
    </div>
  );
}
