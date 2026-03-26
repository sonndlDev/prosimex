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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Trash2, AlertTriangle } from "lucide-react";

const AVAILABLE_PERMISSIONS = [
  { key: "planning", label: "Lập kế hoạch" },
  { key: "schedule", label: "Lịch sản xuất" },
  { key: "orders", label: "Đơn hàng" },
  { key: "customers", label: "Khách hàng" },
  { key: "factories", label: "Nhà máy" },
  { key: "machines", label: "Máy móc" },
  { key: "operations", label: "Công đoạn" },
  { key: "product_groups", label: "Nhóm mã hàng" },
  { key: "products", label: "Mã hàng" },
  { key: "workers", label: "Quản lý công nhân" },
  { key: "attendance", label: "Chấm công" },
  { key: "settings", label: "Cài đặt hệ thống" },
];

export default function UserPage() {
  const queryClient = useQueryClient();
  const [openModal, setOpenModal] = useState(false);
  const [openRoleModal, setOpenRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const initialForm = { username: "", password: "", role_name: "OPERATOR", factory_id: "", is_active: true, permissions: [], full_name: "", phone: "", email: "" };
  const { control, handleSubmit: rhfHandleSubmit, reset, watch, setValue } = useForm({ defaultValues: initialForm });
  const watchRoleName = watch("role_name");
  const watchPermissions = watch("permissions");

  const { data: factories } = useQuery({ queryKey: ["factories"], queryFn: factoryService.getAll });
  const { data: users, isLoading: usersLoading, error: usersError } = useQuery({ queryKey: ["users"], queryFn: userService.getAll });
  const { data: roles, isLoading: rolesLoading } = useQuery({ queryKey: ["roles"], queryFn: userService.getRoles });

  const mutationOpts = { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); handleClose(); } };
  const createMutation = useMutation({ mutationFn: userService.create, ...mutationOpts });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }) => userService.update(id, payload), ...mutationOpts });
  const deleteMutation = useMutation({ mutationFn: userService.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }) });
  const createRoleMutation = useMutation({ mutationFn: userService.createRole, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); setNewRoleName(""); } });
  const deleteRoleMutation = useMutation({ mutationFn: userService.deleteRole, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }) });

  const columns = [
    { id: "username", label: "Tên đăng nhập" },
    { id: "full_name", label: "Tên hiển thị" },
    { id: "role_name", label: "Vai trò", format: (v) => <Badge variant="outline" className="font-semibold">{v}</Badge> },
    { id: "email", label: "Email" },
    { id: "phone", label: "SĐT" },
    {
      id: "is_active", label: "Trạng thái",
      format: (val) => val
        ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50">Hoạt động</Badge>
        : <Badge variant="destructive">Ngừng</Badge>
    },
  ];

  const handleOpen = (user = null) => {
    setSelectedUser(user);
    reset(user ? { username: user.username, password: "", role_name: user.role_name, factory_id: user.factory_id || "", is_active: user.is_active, permissions: user.permissions || [], full_name: user.full_name || "", phone: user.phone || "", email: user.email || "" } : initialForm);
    setOpenModal(true);
  };
  const handleClose = () => { setOpenModal(false); setSelectedUser(null); };
  const togglePermission = (key) => {
    const current = watchPermissions || [];
    setValue("permissions", current.includes(key) ? current.filter(p => p !== key) : [...current, key]);
  };
  const onSubmit = (data) => {
    const payload = { ...data };
    if (selectedUser && !payload.password) delete payload.password;
    if (selectedUser) updateMutation.mutate({ id: selectedUser.id, payload });
    else createMutation.mutate(payload);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="text-2xl font-extrabold text-zinc-950 tracking-tight">Quản lý Người dùng & Quyền</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenRoleModal(true)} className="gap-2 font-semibold">
            <Shield className="w-4 h-4" /> Quản lý Vai trò
          </Button>
          <Button onClick={() => handleOpen()} className="gap-2 font-semibold">+ Thêm người dùng</Button>
        </div>
      </div>

      <GenericTable data={users} columns={columns} isLoading={usersLoading || rolesLoading} error={usersError}
        onEdit={handleOpen}
        onDelete={(u) => { if (window.confirm(`Xóa người dùng "${u.username}"?`)) deleteMutation.mutate(u.id); }}
        onBulkDelete={(ids) => { if (window.confirm(`Xóa ${ids.length} người dùng?`)) ids.forEach(id => deleteMutation.mutate(id)); }}
      />

      {/* Create/Edit User Dialog */}
      <Dialog open={openModal} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={rhfHandleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{selectedUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}</DialogTitle>
            </DialogHeader>
            <div className="py-4 grid grid-cols-2 gap-6">
              {/* Left: account info */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Thông tin cá nhân</p>
                <div className="space-y-1.5">
                  <Label>Họ và tên</Label>
                  <Controller name="full_name" control={control} render={({ field }) => <Input {...field} />} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>SĐT</Label>
                    <Controller name="phone" control={control} render={({ field }) => <Input {...field} />} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Controller name="email" control={control} render={({ field }) => <Input {...field} type="email" />} />
                  </div>
                </div>

                <Separator />
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Tài khoản & Hệ thống</p>
                <div className="space-y-1.5">
                  <Label>Tên đăng nhập <span className="text-red-500">*</span></Label>
                  <Controller name="username" control={control} render={({ field }) => <Input {...field} required disabled={!!selectedUser} />} />
                </div>
                <div className="space-y-1.5">
                  <Label>{selectedUser ? "Mật khẩu mới" : "Mật khẩu"}{!selectedUser && <span className="text-red-500"> *</span>}</Label>
                  <Controller name="password" control={control} render={({ field }) => <Input {...field} type="password" required={!selectedUser} />} />
                </div>
                <div className="space-y-1.5">
                  <Label>Vai trò hệ thống <span className="text-red-500">*</span></Label>
                  <Controller name="role_name" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => { field.onChange(v); if (v === "ADMIN") setValue("factory_id", ""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{roles?.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gán nhà máy</Label>
                  <Controller name="factory_id" control={control} render={({ field }) => (
                    <Select value={String(field.value || "")} onValueChange={field.onChange} disabled={watchRoleName === "ADMIN"}>
                      <SelectTrigger><SelectValue placeholder="Không gán / Tất cả" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Không gán / Tất cả</SelectItem>
                        {factories?.filter(f => f.is_active).map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="flex items-center gap-3">
                  <Label>Đang hoạt động</Label>
                  <Controller name="is_active" control={control} render={({ field }) => (
                    <input type="checkbox" className="w-4 h-4 rounded accent-zinc-950" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                  )} />
                </div>
              </div>

              {/* Right: permissions */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Phân quyền menu truy cập</p>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 max-h-[360px] overflow-y-auto space-y-2">
                  {AVAILABLE_PERMISSIONS.map(p => (
                    <label key={p.key} className="flex items-center gap-3 cursor-pointer group py-1">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-zinc-950"
                        checked={(watchPermissions || []).includes(p.key)}
                        onChange={() => togglePermission(p.key)}
                      />
                      <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-950">{p.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-zinc-400">* Admin mặc định có tất cả quyền</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Hủy</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Lưu thay đổi</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      <Dialog open={openRoleModal} onOpenChange={setOpenRoleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" /> Quản lý Vai trò Hệ thống
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nhập tên vai trò (VD: MANAGER...)"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value.toUpperCase())}
                className="flex-1"
              />
              <Button
                onClick={() => newRoleName.trim() && createRoleMutation.mutate({ name: newRoleName.trim() })}
                disabled={!newRoleName.trim() || createRoleMutation.isPending}
              >
                Thêm
              </Button>
            </div>
            <Separator />
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {roles?.map(role => (
                <div key={role.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-50">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-950">{role.name}</span>
                    <Badge variant={role.is_system ? "secondary" : "outline"} className="text-xs">
                      {role.is_system ? "Hệ thống" : "Tùy chỉnh"}
                    </Badge>
                  </div>
                  <button
                    onClick={() => { if (!role.is_system && window.confirm(`Xóa vai trò "${role.name}"?`)) deleteRoleMutation.mutate(role.id); }}
                    disabled={role.is_system}
                    className="p-1.5 rounded-md text-zinc-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-100 p-3">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700 font-medium leading-relaxed">
                Khi xóa vai trò tùy chỉnh, tất cả người dùng sẽ chuyển về <strong>DEFAULT_USER</strong>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRoleModal(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
