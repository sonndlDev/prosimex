import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Hammer, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { control, handleSubmit: rhfHandleSubmit } = useForm({
    defaultValues: { username: "", password: "" },
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setError("");
    setLoading(true);
    try {
      await login(data.username, data.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f172a]">
      {/* Glow blobs */}
      <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glassmorphism card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 md:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
              <Hammer className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                PROSIMEX <span className="text-blue-400">MES</span>
              </h1>
              <p className="text-sm text-white/50 font-medium mt-1">Hệ thống điều hành sản xuất chuyên nghiệp</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5 border-red-500/50 bg-red-500/10 text-red-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={rhfHandleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-sm font-medium">Tên đăng nhập</Label>
              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Nhập tên đăng nhập"
                    disabled={loading}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500 focus-visible:border-blue-500 h-11"
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/60 text-sm font-medium">Mật khẩu</Label>
              <div className="relative">
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
                      disabled={loading}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500 pr-10 h-11"
                    />
                  )}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 font-bold text-base bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang đăng nhập...</>
              ) : "Đăng nhập"}
            </Button>
          </form>

          <p className="text-center text-white/25 text-xs mt-6">© 2026 Prosimex. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
