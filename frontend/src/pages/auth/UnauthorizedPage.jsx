import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, refreshUser } = useAuth();
  const required = location.state?.requiredPermission;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))] p-6">
      <div className="max-w-sm w-full bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-xl p-8 text-center shadow-[0_4px_16px_rgba(0,0,0,0.06)] space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[rgb(var(--red-light))] border border-[rgb(var(--red-border))] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6 text-[rgb(var(--red))]" />
        </div>
        <div>
          <h1 className="text-[16px] font-semibold text-[rgb(var(--text))]">Không có quyền truy cập</h1>
          <p className="text-[13px] text-[rgb(var(--text-3))] mt-2 leading-relaxed">
            Tài khoản chưa được cấp quyền <strong>Xem</strong> hoặc <strong>Hiện menu</strong>
            {required ? <> cho module <code className="text-[rgb(var(--blue))] bg-[rgb(var(--blue-light))] px-1.5 py-0.5 rounded text-[11px]">{required}</code></> : null}.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <Button onClick={() => refreshUser().then(() => navigate(-1))} variant="outline" size="sm">Tải lại quyền</Button>
          <Button onClick={() => navigate("/")} size="sm">Về trang chủ</Button>
          <Button onClick={() => { logout(); navigate("/login"); }} variant="ghost" size="sm" className="text-[rgb(var(--red))] hover:bg-[rgb(var(--red-light))]">
            Đăng xuất
          </Button>
        </div>
      </div>
    </div>
  );
}
