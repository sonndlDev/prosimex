import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { userService } from "../../services/user.service";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  ShieldCheck,
  Activity,
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const { control: profileControl, handleSubmit: handleProfileFormSubmit } =
    useForm({
      defaultValues: {
        full_name: user?.full_name || "",
        phone: user?.phone || "",
        email: user?.email || "",
      },
    });

  const {
    control: passwordControl,
    handleSubmit: handlePasswordFormSubmit,
    reset: resetPassword,
  } = useForm({
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const profileMutation = useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: () => {
      toast.success("Cập nhật thông tin thành công!");
      refreshUser();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật thông tin");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: () => {
      toast.success("Đổi mật khẩu thành công!");
      resetPassword({ new_password: "", confirm_password: "" });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Lỗi khi đổi mật khẩu");
    },
  });

  const onProfileSubmit = (data) => {
    profileMutation.mutate(data);
  };

  const onPasswordSubmit = (data) => {
    if (data.new_password !== data.confirm_password) {
      return toast.error("Mật khẩu xác nhận không khớp");
    }
    if (data.new_password.length < 6) {
      return toast.error("Mật khẩu phải có nhất 6 ký tự");
    }
    passwordMutation.mutate({ password: data.new_password });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950">
          Hồ sơ cá nhân
        </h1>
        <p className="text-zinc-500 mt-1">Quản lý thông tin tài khoản và bảo mật của bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left side: Avatar & Summary */}
        <div className="md:col-span-4 space-y-6">
          <Card className="overflow-hidden border-zinc-200 shadow-sm">
            <CardContent className="pt-8 pb-6 text-center">
              <Avatar className="w-32 h-32 mx-auto mb-4 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-zinc-950 text-white text-4xl font-bold">
                  {user?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-zinc-950">
                {user?.full_name || user?.username}
              </h2>
              <p className="text-sm text-zinc-500 font-medium">@{user?.username}</p>

              <div className="mt-8 space-y-4 px-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Vai trò:</span>
                  </div>
                  <span className="font-bold text-zinc-950 px-2 py-0.5 bg-zinc-100 rounded text-xs">
                    {user?.role}
                  </span>
                </div>
                <Separator className="bg-zinc-100" />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <Activity className="w-4 h-4" />
                    <span>Trạng thái:</span>
                  </div>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Hoạt động
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right side: Forms */}
        <div className="md:col-span-8 space-y-8">
          {/* Basic Info Form */}
          <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Thông tin cơ bản</CardTitle>
                  <CardDescription>Cập nhật thông tin liên hệ và tên hiển thị</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileFormSubmit(onProfileSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Họ và tên</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Controller
                      name="full_name"
                      control={profileControl}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="full_name"
                          className="pl-10"
                          placeholder="Nhập tên hiển thị"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Controller
                        name="phone"
                        control={profileControl}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="phone"
                            className="pl-10"
                            placeholder="0xxx xxx xxx"
                          />
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Controller
                        name="email"
                        control={profileControl}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="email"
                            className="pl-10"
                            placeholder="example@prosimex.com"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={profileMutation.isPending}
                  className="gap-2 font-bold px-6 h-11"
                >
                  {profileMutation.isPending ? (
                    <Activity className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Lưu thay đổi
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security Form */}
          <Card className="border-zinc-200 shadow-sm border-l-4 border-l-red-500">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-50 rounded-lg">
                  <Lock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <CardTitle>Bảo mật & Mật khẩu</CardTitle>
                  <CardDescription>Thay đổi mật khẩu đăng nhập hệ thống</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordFormSubmit(onPasswordSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">Mật khẩu mới</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Controller
                        name="new_password"
                        control={passwordControl}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="new_password"
                            type={showPassword ? "text" : "password"}
                            className="pl-10 pr-10"
                            placeholder="••••••••"
                          />
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Xác nhận mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Controller
                        name="confirm_password"
                        control={passwordControl}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="confirm_password"
                            type={showPassword ? "text" : "password"}
                            className="pl-10"
                            placeholder="••••••••"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="destructive"
                  disabled={passwordMutation.isPending}
                  className="gap-2 font-bold px-6 h-11"
                >
                  {passwordMutation.isPending ? (
                    <Activity className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  Đổi mật khẩu
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
