import { useEffect, useState, useRef } from "react";
import { ShieldOff, X, Key } from "lucide-react";

export default function AccessDeniedBanner() {
  const [messages, setMessages] = useState([]);
  const recentKeys = useRef(new Set());

  useEffect(() => {
    const handler = (e) => {
      const { message, required_permission } = e.detail || {};
      const key = required_permission || message || "forbidden";
      if (recentKeys.current.has(key)) return;
      recentKeys.current.add(key);
      setTimeout(() => recentKeys.current.delete(key), 1000);
      const id = Date.now() + Math.random();
      setMessages(prev => [...prev, { id, message, required_permission }]);
      setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 5000);
    };
    window.addEventListener("api:forbidden", handler);
    return () => window.removeEventListener("api:forbidden", handler);
  }, []);

  if (!messages.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
      {messages.map(({ id, message, required_permission }) => (
        <div key={id} className="flex items-start gap-3 bg-[rgb(var(--surface))] border border-[rgb(var(--red-border))] rounded-lg px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.1)] page-enter">
          <div className="w-8 h-8 rounded-md bg-[rgb(var(--red-light))] flex items-center justify-center flex-shrink-0">
            <ShieldOff className="w-4 h-4 text-[rgb(var(--red))]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--red))] mb-1">Không có quyền truy cập</p>
            <p className="text-[12px] text-[rgb(var(--text-3))] leading-snug">{message}</p>
            {required_permission && (
              <div className="flex items-center gap-1.5 mt-2 bg-[rgb(var(--amber-light))] border border-[rgb(var(--amber-border))] rounded px-2 py-1">
                <Key className="w-3 h-3 text-[rgb(var(--amber))] flex-shrink-0" />
                <span className="text-[10px] font-semibold text-[rgb(var(--amber))]">Cần quyền:</span>
                <code className="text-[10px] font-mono text-[rgb(var(--text-2))] bg-[rgb(var(--surface-2))] px-1 rounded">{required_permission}</code>
              </div>
            )}
          </div>
          <button onClick={() => setMessages(prev => prev.filter(m => m.id !== id))} className="text-[rgb(var(--text-4))] hover:text-[rgb(var(--text-2))] flex-shrink-0 mt-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
