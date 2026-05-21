import { useEffect, useState, useRef } from "react";
import { ShieldOff, X, Key } from "lucide-react";

/**
 * Lắng nghe sự kiện "api:forbidden" từ Axios interceptor và hiển thị banner lỗi.
 * - Hiển thị quyền còn thiếu (required_permission) nếu có
 * - Chống spam: loại bỏ notification trùng lặp trong vòng 1 giây
 * - Tự động ẩn sau 7 giây, hoặc bấm X để đóng
 */
export default function AccessDeniedBanner() {
  const [messages, setMessages] = useState([]);
  const recentKeys = useRef(new Set());

  useEffect(() => {
    const handler = (e) => {
      const { message, required_permission } = e.detail || {};
      const dedupeKey = required_permission || message || "forbidden";

      // Bỏ qua nếu cùng permission đã hiện trong vòng 1 giây
      if (recentKeys.current.has(dedupeKey)) return;
      recentKeys.current.add(dedupeKey);
      setTimeout(() => recentKeys.current.delete(dedupeKey), 1000);

      const id = Date.now() + Math.random();
      setMessages((prev) => [...prev, { id, message, required_permission }]);

      // Tự động ẩn sau 5 giây
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }, 5000);
    };

    window.addEventListener("api:forbidden", handler);
    return () => window.removeEventListener("api:forbidden", handler);
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {messages.map(({ id, message, required_permission }) => (
        <div
          key={id}
          className="flex items-start gap-3 bg-white border border-red-200 rounded-2xl px-4 py-4 shadow-2xl shadow-red-100/50 animate-in slide-in-from-right-5 duration-300"
        >
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <ShieldOff className="w-5 h-5 text-red-500" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-red-600 mb-1">
              Không có quyền truy cập
            </p>
            <p className="text-sm text-zinc-600 leading-snug">{message}</p>

            {required_permission && (
              <div className="mt-2 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <Key className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="text-[11px] font-black text-amber-700 uppercase tracking-widest">
                  Cần quyền:
                </span>
                <code className="text-[11px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  {required_permission}
                </code>
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={() => setMessages((prev) => prev.filter((m) => m.id !== id))}
            className="text-zinc-300 hover:text-zinc-500 transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
