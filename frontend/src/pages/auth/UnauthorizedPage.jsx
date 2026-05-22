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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-zinc-200 shadow-lg p-8 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h1 className="text-xl font-black text-zinc-900">Không có quyền truy cập</h1>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Tài khoản của bạn chưa được cấp quyền <strong>Xem</strong> hoặc <strong>Hiện menu</strong>
          {required ? <> cho module <code className="text-indigo-700">{required}</code></> : null}.
        </p>
        <p className="text-xs text-zinc-400 font-bold">
          Thử đăng xuất và đăng nhập lại sau khi admin cập nhật quyền. Cần tick cả <strong>Hiện menu</strong> và <strong>Xem</strong> để dùng đầy đủ.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={() => refreshUser().then(() => navigate(-1))} variant="outline" className="rounded-xl font-bold">
            Tải lại quyền
          </Button>
          <Button onClick={() => navigate("/")} className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700">
            Về trang chủ
          </Button>
          <Button onClick={() => { logout(); navigate("/login"); }} variant="ghost" className="rounded-xl font-bold text-red-600">
            Đăng xuất
          </Button>
        </div>
      </div>
    </div>
  );
}
