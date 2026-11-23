import React, { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Info, X } from "lucide-react";
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
  rule_type: "EXTRA_TARGET",
  run_date: "",
  run_date_end: "",
  target_dates: [],
  pending_target: "",
  note: "",
};

/* ---------- Tiện ích ngày (YYYY-MM-DD) ---------- */

const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/** Liệt kê các ngày từ start đến end (end rỗng = chỉ start). */
const rangeDays = (start, end) => {
  const last = end || start;
  const out = [];
  for (let d = start; d <= last; d = addDays(d, 1)) out.push(d);
  return out;
};

/**
 * Ngày job tự bỏ qua: với mỗi ngày tạo job T, job ngày T-1 không cần tạo phiếu mặc định nữa
 * (vì T đã được tạo từ ngày chạy), trừ khi T-1 chính là ngày chạy.
 */
const autoSkipDates = (runStart, runEnd, targets) => {
  if (!runStart || !targets?.length) return [];
  const runDays = new Set(rangeDays(runStart, runEnd));
  const skips = targets.map((t) => addDays(t, -1)).filter((d) => !runDays.has(d));
  return [...new Set(skips)].sort();
};

const formatList = (list) => (list && list.length ? list.join(", ") : "-");

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

  const isExtra = form.rule_type === "EXTRA_TARGET";
  const formSkips = isExtra ? autoSkipDates(form.run_date, form.run_date_end, form.target_dates) : [];

  const addTargetDate = () => {
    const d = form.pending_target;
    if (!d) return toast.error("Vui lòng chọn ngày");
    if (form.target_dates.includes(d)) return toast.error("Ngày này đã có trong danh sách");
    setForm({ ...form, target_dates: [...form.target_dates, d].sort(), pending_target: "" });
  };

  const removeTargetDate = (d) => {
    setForm({ ...form, target_dates: form.target_dates.filter((x) => x !== d) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.run_date) return toast.error("Vui lòng chọn ngày chạy job");
    if (isExtra && form.target_dates.length === 0) {
      return toast.error("Vui lòng thêm ít nhất một ngày tạo job");
    }
    createMutation.mutate({
      rule_type: form.rule_type,
      run_date: form.run_date,
      run_date_end: form.run_date_end || null,
      target_dates: isExtra ? form.target_dates : null,
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
              Chọn ngày chạy job và các ngày cần tạo phiếu. Hệ thống tự tính ngày job được bỏ qua.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Loại quy tắc</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.rule_type}
                  onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
                >
                  <option value="EXTRA_TARGET">Tạo thêm phiếu</option>
                  <option value="OFF_RUN">Không chạy job</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Ngày chạy job</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={form.run_date}
                    onChange={(e) => setForm({ ...form, run_date: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="Đến (tùy chọn)"
                    min={form.run_date || undefined}
                    value={form.run_date_end}
                    onChange={(e) => setForm({ ...form, run_date_end: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Ô bên phải để trống nếu chỉ chạy một ngày.</p>
              </div>

              {isExtra && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Tạo job cho ngày nào</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={form.pending_target}
                      onChange={(e) => setForm({ ...form, pending_target: e.target.value })}
                      className="max-w-xs"
                    />
                    <Button type="button" variant="outline" onClick={addTargetDate}>
                      <Plus className="mr-1 h-4 w-4" /> Thêm ngày
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {form.target_dates.length === 0 && (
                      <span className="text-xs text-muted-foreground">Chưa có ngày nào. Ví dụ: 24/11, 25/11</span>
                    )}
                    {form.target_dates.map((d) => (
                      <Badge key={d} variant="secondary" className="gap-1 pr-1">
                        {d}
                        <button
                          type="button"
                          onClick={() => removeTargetDate(d)}
                          className="rounded p-0.5 hover:bg-zinc-300"
                          aria-label={`Xóa ${d}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {isExtra && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Bỏ qua ngày nào (tự động)</Label>
                  <div className="rounded-md border bg-zinc-50 px-3 py-2 text-sm">
                    {formSkips.length > 0 ? (
                      <span>
                        Job các ngày <b>{formSkips.join(", ")}</b> sẽ không tạo phiếu mặc định,
                        vì các ngày tạo job đã được tạo từ ngày chạy.
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Chưa có ngày nào được tự bỏ qua.</span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>Ghi chú</Label>
                <Input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm quy tắc
                </Button>
              </div>
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
                <TableHead>Tạo job cho ngày</TableHead>
                <TableHead>Tự bỏ qua</TableHead>
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
              {rules.map((rule) => {
                const isOff = rule.rule_type === "OFF_RUN";
                const skips = isOff ? [] : autoSkipDates(rule.run_date, rule.run_date_end, rule.target_dates || []);
                return (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Badge variant={isOff ? "destructive" : "default"}>
                        {RULE_LABELS[rule.rule_type] || rule.rule_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rule.run_date_end ? `${rule.run_date} → ${rule.run_date_end}` : rule.run_date}
                    </TableCell>
                    <TableCell>{isOff ? "-" : formatList(rule.target_dates)}</TableCell>
                    <TableCell>{formatList(skips)}</TableCell>
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
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AutoTicketGuideDialog open={showGuide} onOpenChange={setShowGuide} />
    </div>
  );
}
