import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../services/user.service";
import { factoryService } from "../../services/factory.service";
import GenericTable from "../../components/GenericTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Shield, Trash2, AlertTriangle, User, Key, Mail, Phone, Home, Check, ChevronsUpDown, Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const PERMISSION_GROUPS = [
  {
    groupLabel: "Sản xuất",
    items: [
      { key: "dashboard", label: "Bảng điều khiển" },
      { key: "planning", label: "Lập kế hoạch" },
      { key: "daily_tickets", label: "Phiếu SX hàng ngày" },
      { key: "import_excel", label: "Import Excel (Dữ liệu gốc)" },
      { key: "production_output", label: "Nhập sản lượng" },
      { key: "schedule", label: "Timeline" },
      { key: "outsourcing", label: "Phiếu gia công" },
      { key: "orders", label: "Đơn hàng" },
      { key: "warehouse", label: "Thông tin kho" },
      { key: "product_inventory", label: "Tồn kho BTP & TP" },
      { key: "plan_vs_actual", label: "Báo cáo KH vs TT" },
    ]
  },
  {
    groupLabel: "Dữ liệu gốc",
    items: [
      { key: "customers", label: "Khách hàng" },
      { key: "factories", label: "Nhà máy" },
      { key: "machines", label: "Máy móc" },
      { key: "operations", label: "Công đoạn" },
      { key: "suppliers", label: "Nhà cung cấp" },
      { key: "product_groups", label: "Nhóm mã hàng" },
      { key: "products", label: "Mã hàng" },
    ]
  },
  {
    groupLabel: "Hệ thống",
    items: [
      { key: "attendance", label: "Chấm công (C.Nhân)" },
      { key: "attendance_management", label: "QL Chấm công" },
      { key: "workers", label: "Quản lý công nhân" },
      { key: "users", label: "Người dùng & Quyền" },
      { key: "settings", label: "Cài đặt hệ thống" },
    ]
  }
];

export default function UserPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const initialForm = { username: "", password: "", role_name: "OPERATOR", factory_id: "", is_active: true, permissions: [], full_name: "", phone: "", email: "" };
  const { control, handleSubmit: rhfHandleSubmit, reset, watch, setValue } = useForm({ defaultValues: initialForm });
  const watchRoleName = watch("role_name");
  const watchPermissions = watch("permissions");

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { data: factoriesData } = useQuery({ queryKey: ["factories"], queryFn: factoryService.getAll });
  const factories = factoriesData?.data || (Array.isArray(factoriesData) ? factoriesData : []);
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["users", page, pageSize, search],
    queryFn: () => userService.getAll({ page, limit: pageSize, search })
  });

  const users = usersData?.data || [];
  const totalItems = usersData?.total || 0;

  const { data: roles, isLoading: rolesLoading } = useQuery({ queryKey: ["roles"], queryFn: userService.getRoles });

  const mutationOpts = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); handleClose(); } };
  const createMutation = useMutation({ mutationFn: userService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => userService.update(id, payload), ...mutationOpts });
  const deleteMutation = useMutation({ mutationFn: userService.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }) });
  const createRoleMutation = useMutation({ mutationFn: userService.createRole, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); setNewRoleName(""); } });
  const deleteRoleMutation = useMutation({ mutationFn: userService.deleteRole, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }) });

  const columns = [
    { id: "username", label: "Tài khoản", className: "font-bold text-indigo-700" },
    { id: "full_name", label: "Họ và tên" },
    {
      id: "role_name",
      label: "Vai trò",
      format: (v) => <Badge variant="outline" className="font-bold border-indigo-200 text-indigo-700 bg-indigo-50/50">{v}</Badge>
    },
    { id: "email", label: "Email" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-3 py-1 rounded-full">Hoạt động</Badge>
        : <Badge variant="destructive" className="px-3 py-1 rounded-full">Tạm ngừng</Badge>
    },
  ];

  const handleOpen = (user = null) => {
    setSelectedUser(user);
    setIsChangingPassword(false);
    if (user) {
      const editValues = {
        username: user.username,
        password: "",
        role_name: user.role_name,
        factory_id: user.factory_id || "",
        is_active: user.is_active ?? true,
        permissions: user.permissions || [],
        full_name: user.full_name || "",
        phone: user.phone || "",
        email: user.email || ""
      };
      reset(editValues);
      // Extra safety for modal render cycle
      setTimeout(() => reset(editValues), 0);
    } else {
      reset(initialForm);
    }
    setOpenModal(true);
  };
  const handleClose = () => { setOpenModal(false); setSelectedUser(null); };
  const togglePermission = (key) => {
    const current = watchPermissions || [];
    setValue("permissions", current.includes(key) ? current.filter(p => p !== key) : [...current, key]);
  };
  const onSubmit = (data) => {
    const payload = { ...data };

    if (selectedUser) {
      // Only send password if explicitly changing OR if it's a new user
      if (!isChangingPassword) {
        delete payload.password;
      } else if (!payload.password) {
        delete payload.password;
      }

      // If personal info fields are empty and not changed, let backend COALESCE handle it
      // Alternatively, we can omit them if they matched original to be super safe
    }

    if (selectedUser) updateMutation.mutate({ id: selectedUser.id, payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Quản trị Hệ thống</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Phân quyền & Kiểm soát truy cập người dùng</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setOpenRoleModal(true)} className="h-11 rounded-xl border-zinc-200 hover:bg-zinc-50 font-bold gap-2">
            <Shield className="w-4 h-4 text-indigo-500" /> Vai trò (Roles)
          </Button>
          <Button onClick={() => handleOpen()} className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 font-black uppercase text-xs tracking-widest gap-2">
            <UserPlus className="w-4 h-4" /> Thêm người dùng
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <GenericTable
          data={users}
          columns={columns}
          isLoading={usersLoading || rolesLoading}
          error={usersError}
          onEdit={handleOpen}
          onDelete={(u) => { if (window.confirm(`Xóa người dùng "${u.username}"?`)) deleteMutation.mutate(u.id); }}
          onBulkDelete={(ids) => { if (window.confirm(`Xóa ${ids.length} người dùng?`)) ids.forEach(id => deleteMutation.mutate(id)); }}
          isServerSide={true}
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearch}
        />
      </div>

      {/* Create/Edit User Dialog */}
      <Dialog open={openModal} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden border-zinc-200 rounded-2xl">
          <form onSubmit={rhfHandleSubmit(onSubmit)} autoComplete="off">
            <DialogHeader className="px-6 py-4 bg-zinc-50 border-b border-zinc-100">
              <DialogTitle className="text-xl font-black text-zinc-950 uppercase tracking-tight">
                {selectedUser ? "Cập nhật tài khoản" : "Tạo người dùng mới"}
              </DialogTitle>
            </DialogHeader>
            <div className="p-0 flex flex-col md:flex-row h-[600px]">
              {/* Left Column: Information */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto border-r border-zinc-100 bg-white">
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Thông tin cá nhân</p>
                  <div className="space-y-2 group">
                    <Label className="text-xs font-bold text-zinc-500 group-hover:text-indigo-600">Họ và tên hiển thị</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                      <Controller name="full_name" control={control} render={({ field }) => <Input {...field} className="pl-10 h-11 rounded-xl border-zinc-200 font-bold focus-visible:ring-indigo-500" placeholder="VD: Nguyễn Văn A" />} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500">Số điện thoại</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                        <Controller name="phone" control={control} render={({ field }) => <Input {...field} className="pl-10 h-11 rounded-xl border-zinc-200 font-bold focus-visible:ring-indigo-500" />} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500">Địa chỉ Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                        <Controller name="email" control={control} render={({ field }) => <Input {...field} className="pl-10 h-11 rounded-xl border-zinc-200 font-bold focus-visible:ring-indigo-500" type="email" autoComplete="none" />} />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-zinc-50" />

                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Xác thực hệ thống</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                      <Label className="text-xs font-bold text-zinc-500 group-hover:text-indigo-600">Tên truy cập <span className="text-red-500">*</span></Label>
                      <Controller name="username" control={control} render={({ field }) => <Input {...field} required disabled={!!selectedUser} className="h-11 rounded-xl border-zinc-200 font-bold disabled:opacity-50" />} />
                    </div>
                    <div className="space-y-2 group">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-zinc-500 group-hover:text-indigo-600">
                          {selectedUser ? "Mật khẩu hệ thống" : "Mật khẩu"} {!selectedUser && <span className="text-red-500">*</span>}
                        </Label>
                        {selectedUser && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsChangingPassword(!isChangingPassword)}
                            className={cn("h-6 px-2 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all", isChangingPassword ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200")}
                          >
                            {isChangingPassword ? "Đang đổi" : "Đổi mật khẩu?"}
                          </Button>
                        )}
                      </div>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                        <Controller
                          name="password"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              type="password"
                              disabled={selectedUser && !isChangingPassword}
                              required={!selectedUser}
                              className={cn("pl-10 h-11 rounded-xl border-zinc-200 font-bold focus-visible:ring-indigo-500 transition-all", selectedUser && !isChangingPassword && "opacity-30 bg-zinc-50 select-none cursor-not-allowed")}
                              autoComplete="new-password"
                              placeholder={selectedUser && !isChangingPassword ? "••••••••••••" : "Nhập mật khẩu mới..."}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500">Vai trò chính <span className="text-red-500">*</span></Label>
                      <Controller name="role_name" control={control} render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full h-11 justify-between text-xs font-bold border-zinc-200 rounded-xl hover:border-indigo-300 bg-white">
                              {field.value || "Chọn vai trò..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl rounded-xl border-zinc-100 overflow-hidden" align="start">
                            <Command>
                              <CommandInput placeholder="Tìm vai trò..." />
                              <CommandList>
                                <CommandEmpty className="py-4 text-center text-xs text-zinc-400 font-bold">Không thấy</CommandEmpty>
                                <CommandGroup>
                                  {roles?.map(r => (
                                    <CommandItem
                                      key={r.id}
                                      value={r.name}
                                      onSelect={() => { field.onChange(r.name); if (r.name === "ADMIN") setValue("factory_id", ""); }}
                                      className="px-3 py-2 cursor-pointer font-bold text-xs"
                                    >
                                      {r.name}
                                      <Check className={cn("ml-auto h-4 w-4 text-indigo-600", field.value === r.name ? "opacity-100" : "opacity-0")} />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-zinc-500">Gán vào xưởng</Label>
                      <Controller name="factory_id" control={control} render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" disabled={watchRoleName === "ADMIN"} className="w-full h-11 justify-between text-xs font-bold border-zinc-200 rounded-xl hover:border-indigo-300 bg-white disabled:bg-zinc-50">
                              <div className="flex items-center gap-2 overflow-hidden truncate">
                                <Home className="h-4 w-4 text-zinc-300" />
                                {factories?.find(f => String(f.id) === String(field.value))?.name || "Tất cả / Quản trị"}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-2xl rounded-xl border-zinc-100 overflow-hidden" align="start">
                            <Command>
                              <CommandInput placeholder="Tìm xưởng..." />
                              <CommandList>
                                <CommandEmpty className="py-4 text-center text-xs text-zinc-400 font-bold">Không thấy</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem value="" onSelect={() => field.onChange("")} className="px-3 py-2 font-bold text-xs">Phạm vi công ty</CommandItem>
                                  {factories?.filter(f => f.is_active).map(f => (
                                    <CommandItem
                                      key={f.id}
                                      value={f.name}
                                      onSelect={() => field.onChange(String(f.id))}
                                      className="px-3 py-2 cursor-pointer font-bold text-xs"
                                    >
                                      {f.name}
                                      <Check className={cn("ml-auto h-4 w-4 text-indigo-600", String(field.value) === String(f.id) ? "opacity-100" : "opacity-0")} />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 transition-all hover:bg-zinc-100/50">
                    <Controller name="is_active" control={control} render={({ field }) => (
                      <input type="checkbox" id="user_active" className="w-5 h-5 rounded accent-indigo-600 cursor-pointer" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                    )} />
                    <Label htmlFor="user_active" className="text-[11px] font-black uppercase text-zinc-600 cursor-pointer">Tài khoản này đang được phép truy cập hệ thống</Label>
                  </div>
                </div>
              </div>

              {/* Right Column: Permissions */}
              <div className="w-full md:w-[320px] bg-zinc-50 p-6 overflow-y-auto space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Danh mục truy cập</p>
                  <Badge variant="outline" className="text-[10px] border-zinc-200 text-zinc-400 bg-white">Lựa chọn riêng biệt</Badge>
                </div>
                <div className="space-y-6">
                  {PERMISSION_GROUPS.map(group => (
                    <div key={group.groupLabel} className="space-y-2">
                      <p className="text-[11px] font-bold text-indigo-700 tracking-wide">{group.groupLabel}</p>
                      <div className="grid gap-2">
                        {group.items.map(p => (
                          <label
                            key={p.key}
                            className={cn(
                              "flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group",
                              (watchPermissions || []).includes(p.key)
                                ? "bg-white border-indigo-200 shadow-sm shadow-indigo-50/50"
                                : "bg-transparent border-transparent hover:border-zinc-200"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded-md accent-indigo-600 cursor-pointer"
                              checked={(watchPermissions || []).includes(p.key)}
                              onChange={() => togglePermission(p.key)}
                            />
                            <span className={cn(
                              "text-xs font-bold transition-colors",
                              (watchPermissions || []).includes(p.key) ? "text-indigo-900" : "text-zinc-500 group-hover:text-zinc-900"
                            )}>
                              {p.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex gap-3 items-start mt-4">
                  <AlertTriangle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-indigo-700 leading-relaxed italic">
                    * Lưu ý: Tài khoản Admin sẽ mặc định có toàn bộ quyền truy cập danh mục hệ thống.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 py-4 bg-zinc-50 border-t border-zinc-100">
              <Button type="button" variant="ghost" onClick={handleClose} className="rounded-xl font-bold">Hủy bỏ</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-xl px-10 bg-indigo-600 hover:bg-indigo-700 font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100">
                {selectedUser ? "Cập nhật tài khoản" : "Khởi tạo tài khoản"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog open={openRoleModal} onOpenChange={setOpenRoleModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-zinc-200 rounded-2xl">
          <DialogHeader className="px-6 py-4 bg-zinc-50 border-b border-zinc-100">
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-zinc-950 uppercase tracking-tight">
              <Shield className="w-5 h-5 text-indigo-600" /> Vai trò Hệ thống
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="flex gap-2">
              <Input
                placeholder="VD: QUẢN LÝ XƯỞNG..."
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value.toUpperCase())}
                className="h-11 rounded-xl border-zinc-200 font-bold focus-visible:ring-indigo-500"
              />
              <Button
                onClick={() => newRoleName.trim() && createRoleMutation.mutate({ name: newRoleName.trim() })}
                disabled={!newRoleName.trim() || createRoleMutation.isPending}
                className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold"
              >
                Thêm
              </Button>
            </div>
            <Separator className="bg-zinc-100" />
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {roles?.map(role => (
                <div key={role.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-zinc-100 hover:bg-zinc-50 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-sm text-zinc-950">{role.name}</span>
                    <Badge variant={role.is_system ? "secondary" : "outline"} className={cn("text-[9px] uppercase font-black px-2 py-0.5", role.is_system ? "bg-zinc-200" : "bg-white border-indigo-100 text-indigo-600")}>
                      {role.is_system ? "Mặc định" : "Tùy chỉnh"}
                    </Badge>
                  </div>
                  {!role.is_system && (
                    <button
                      onClick={() => { if (window.confirm(`Xóa vai trò "${role.name}"?`)) deleteRoleMutation.mutate(role.id); }}
                      className="p-2 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-orange-50 border border-orange-100 p-4">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-orange-700 font-bold leading-relaxed">
                Khi xóa một vai trò đang được sử dụng, hệ thống sẽ tự động gán tài khoản đó về vai trò <strong>DEFAULT_USER</strong> để đảm bảo an toàn.
              </p>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 uppercase tracking-widest text-[10px]">
            <p className="text-zinc-400 font-bold text-center w-full">Vui lòng quản lý vai trò cẩn trọng.</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
