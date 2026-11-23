import React, { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Info } from "lucide-react";
import { autoTicketScheduleService } from "../../services/auto-ticket-schedule.service";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AutoTicketGuideDialog from "./AutoTicketGuideDialog";

const RULE_LABELS = {
  OFF_RUN: "Không chạy job",
  EXTRA_TARGET: "Tạo thêm phiếu",
};

const JOB_STATUS_LABELS = {
  PENDING: { text: "Đang chờ", className: "bg-zinc-200 text-zinc-800 hover:bg-zinc-200" },
  RUNNING: { text: "Đang chạy", className: "bg-blue-600 text-white hover:bg-blue-600" },
  DONE: { text: "Đã chạy", className: "bg-emerald-600 text-white hover:bg-emerald-600" },
};

const emptyForm = {
  rule_type: "OFF_RUN",
  run_date: "",
  run_date_end: "",
  target_date: "",
  target_date_end: "",
  skip_run_date: "",
  skip_run_date_end: "",
  note: "",
};

/** Hiển thị khoảng ngày: "2026-11-24 → 2026-11-26", hoặc một ngày nếu không có ngày kết thúc. */
const formatRange = (start, end) => (start ? (end ? `${start} → ${end}` : start) : "-");

export default function AutoTicketSchedulePage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [showGuide, setShowGuide] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["auto-ticket-schedule"],
    queryFn: () => autoTicketScheduleService.getAll(),
  });
  const rules = data?.data || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["auto-ticket-schedule"] });

  const createMutation = useMutation({
    mutationFn: autoTicketScheduleService.create,
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
      toast.success("Đã thêm quy tắc");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Có lỗi xảy ra"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => autoTicketScheduleService.updateStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success("Đã cập nhật trạng thái");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Có lỗi xảy ra"),
  });

  const deleteMutation = useMutation({
    mutationFn: autoTicketScheduleService.delete,
    onSuccess: () => {
      invalidate();
      toast.success("Đã xóa quy tắc");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Có lỗi xảy ra"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.run_date) return toast.error("Vui lòng chọn ngày chạy");
    if (form.rule_type === "EXTRA_TARGET" && !form.target_date) {
      return toast.error("Vui lòng chọn ngày tạo phiếu");
    }
    const isExtra = form.rule_type === "EXTRA_TARGET";
    createMutation.mutate({
      rule_type: form.rule_type,
      run_date: form.run_date,
      run_date_end: form.run_date_end || null,
      target_date: isExtra ? form.target_date : null,
      target_date_end: isExtra ? form.target_date_end || null : null,
      skip_run_date: isExtra ? form.skip_run_date || null : null,
      skip_run_date_end: isExtra && form.skip_run_date ? form.skip_run_date_end || null : null,
      note: form.note,
    });
  };

  const handleDelete = (rule) => {
    if (!window.confirm("Xóa quy tắc này?")) return;
    deleteMutation.mutate(rule.id);
  };

  const handleToggleStatus = (rule, checked) => {
    statusMutation.mutate({ id: rule.id, status: checked ? "ACTIVE" : "HIDE" });
  };

  const canCreate = hasPermission("auto_ticket_schedule:create");
  const canUpdate = hasPermission("auto_ticket_schedule:update");
  const canDelete = hasPermission("auto_ticket_schedule:delete");
  const columnCount = 8;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lịch tạo phiếu tự động</h1>
          <p className="text-sm text-muted-foreground">
            Job chạy lúc 15:00 hằng ngày (giờ Việt Nam). Thay đổi có hiệu lực ở lần chạy tiếp theo, không cần đổi code.
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowGuide(true)}>
          <Info className="mr-2 h-4 w-4" />
          Hướng dẫn
        </Button>
      </div>

      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Thêm quy tắc</CardTitle>
            <CardDescription>
              Không chạy job: bỏ qua job của ngày đã chọn. Tạo thêm phiếu: khi job chạy ở ngày chạy, tạo thêm phiếu cho ngày tạo phiếu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3 xl:grid-cols-5 md:items-end">
              <div className="space-y-2">
                <Label>Loại quy tắc</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.rule_type}
                  onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
                >
                  <option value="OFF_RUN">Không chạy job</option>
                  <option value="EXTRA_TARGET">Tạo thêm phiếu</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Ngày chạy job (từ)</Label>
                <Input
                  type="date"
                  value={form.run_date}
                  onChange={(e) => setForm({ ...form, run_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ngày chạy job (đến)</Label>
                <Input
                  type="date"
                  placeholder="Để trống = 1 ngày"
                  min={form.run_date || undefined}
                  value={form.run_date_end}
                  onChange={(e) => setForm({ ...form, run_date_end: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ngày tạo phiếu (từ)</Label>
                <Input
                  type="date"
                  disabled={form.rule_type !== "EXTRA_TARGET"}
                  value={form.target_date}
                  onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ngày tạo phiếu (đến)</Label>
                <Input
                  type="date"
                  disabled={form.rule_type !== "EXTRA_TARGET"}
                  placeholder="Để trống = 1 ngày"
                  min={form.target_date || undefined}
                  value={form.target_date_end}
                  onChange={(e) => setForm({ ...form, target_date_end: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ngày không chạy job (từ)</Label>
                <Input
                  type="date"
                  disabled={form.rule_type !== "EXTRA_TARGET"}
                  value={form.skip_run_date}
                  onChange={(e) => setForm({ ...form, skip_run_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ngày không chạy job (đến)</Label>
                <Input
                  type="date"
                  disabled={form.rule_type !== "EXTRA_TARGET" || !form.skip_run_date}
                  placeholder="Để trống = 1 ngày"
                  min={form.skip_run_date || undefined}
                  value={form.skip_run_date_end}
                  onChange={(e) => setForm({ ...form, skip_run_date_end: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ghi chú</Label>
                <Input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách quy tắc đang hoạt động</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loại</TableHead>
                <TableHead>Ngày chạy job</TableHead>
                <TableHead>Ngày tạo phiếu</TableHead>
                <TableHead>Ngày không chạy job</TableHead>
                <TableHead>Ghi chú</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tình trạng</TableHead>
                {canDelete && <TableHead className="text-right">Thao tác</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center">Đang tải...</TableCell>
                </TableRow>
              )}
              {!isLoading && rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                    Chưa có quy tắc nào. Job sẽ chạy theo quy tắc mặc định.
                  </TableCell>
                </TableRow>
              )}
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <Badge variant={rule.rule_type === "OFF_RUN" ? "destructive" : "default"}>
                      {RULE_LABELS[rule.rule_type] || rule.rule_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatRange(rule.run_date, rule.run_date_end)}</TableCell>
                  <TableCell>{formatRange(rule.target_date, rule.target_date_end)}</TableCell>
                  <TableCell>{formatRange(rule.skip_run_date, rule.skip_run_date_end)}</TableCell>
                  <TableCell>{rule.note || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.status === "ACTIVE"}
                        disabled={!canUpdate || statusMutation.isPending}
                        onCheckedChange={(checked) => handleToggleStatus(rule, checked)}
                      />
                      <span className="text-sm">{rule.status === "ACTIVE" ? "Active" : "Hide"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={JOB_STATUS_LABELS[rule.job_status]?.className}>
                      {JOB_STATUS_LABELS[rule.job_status]?.text || rule.job_status}
                    </Badge>
                  </TableCell>
                  {canDelete && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rule)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AutoTicketGuideDialog open={showGuide} onOpenChange={setShowGuide} />
    </div>
  );
}
