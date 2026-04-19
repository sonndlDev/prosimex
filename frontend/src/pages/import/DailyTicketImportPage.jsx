import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileSpreadsheet, Upload, CheckCircle2,
  Loader2, FileText, ArrowRight, Info, Database
} from "lucide-react";
import { importExcelService } from "../../services/import-excel.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Định nghĩa cột Excel ────────────────────────────────────────────────────
const COLUMNS = [
  { key: "stt", labels: ["STT", "Số TT", "Số thứ tự", "No", "No."] },
  { key: "customer", labels: ["Khách hàng", "Customer", "KH"] },
  { key: "product_group", labels: ["Nhóm mã hàng", "Nhóm mã", "Product Group", "Nhom ma hang"] },
  { key: "product", labels: ["Tên mã hàng", "Mã hàng", "Product", "Ma hang"] },
  { key: "operation", labels: ["Tên công đoạn", "Công đoạn", "Operation"] },
  { key: "dinh_muc", labels: ["Định mức (SP/ 8h)", "Định mức", "Dinh Muc", "Dinh muc", "Dinh Mức"] },
];

const PREVIEW_COLS = [
  { key: "stt", header: "STT" },
  { key: "customer", header: "Khách hàng" },
  { key: "product_group", header: "Nhóm mã hàng" },
  { key: "product", header: "Tên mã hàng" },
  { key: "operation", header: "Công đoạn" },
  { key: "dinh_muc", header: "Định mức" },
];

// ─── Parse Excel ─────────────────────────────────────────────────────────────
function parseExcelFile(file, onDone, onError, onFinally) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = (jsonData[0] || []).map(h => String(h || "").trim());

      // Map cột Excel → field key
      const idxMap = {};
      COLUMNS.forEach(col => {
        idxMap[col.key] = headers.findIndex(h =>
          col.labels.some(label => h.toLowerCase() === label.toLowerCase())
        );
      });

      const mapped = jsonData.slice(1)
        .filter(row => row.some(cell => cell !== undefined && cell !== ""))
        .map(row => {
          const obj = {};
          COLUMNS.forEach(col => {
            const idx = idxMap[col.key];
            const raw = idx >= 0 ? row[idx] : undefined;
            obj[col.key] = (raw !== null && raw !== undefined && String(raw).trim() !== "")
              ? String(raw).trim()
              : null;
          });
          return obj;
        })
        .filter(row => Object.values(row).some(v => v !== null));

      onDone(mapped);
    } catch (err) {
      console.error("Excel parse error:", err);
      onError();
    } finally {
      onFinally();
    }
  };
  reader.readAsArrayBuffer(file);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImportExcelPage() {
  const [file, setFile] = useState(null);
  const [previewData, setPreview] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [summary, setSummary] = useState(null);

  const mutation = useMutation({
    mutationFn: importExcelService.importMasterData,
    onSuccess: (data) => {
      toast.success(data.message || "Import thành công!");
      setSummary(data.summary);
      setFile(null);
      setPreview([]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Lỗi khi import dữ liệu!");
    },
  });

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview([]);
    setSummary(null);
    setIsParsing(true);
    parseExcelFile(
      f,
      (rows) => setPreview(rows),
      () => toast.error("Không đọc được file. Kiểm tra định dạng Excel."),
      () => setIsParsing(false)
    );
  };

  return (
    <div className=" mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="bg-white rounded-[32px] border border-zinc-200 shadow-sm p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <FileSpreadsheet className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 shrink-0">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-950 tracking-tight leading-none">Import Dữ Liệu Gốc</h2>

          </div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Upload Panel */}
        <div className="lg:col-span-4">
          <Card className="border-none py-0 shadow-xl shadow-zinc-200/40 rounded-[28px] overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="p-7 bg-zinc-950 text-white">
                <h3 className="text-sm font-black uppercase tracking-widest">Tải file lên</h3>
                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Định dạng .xlsx · .xls
                </p>
              </div>

              <div className="p-7 space-y-5">
                {/* Drop zone */}
                {!file ? (
                  <div className="group relative">
                    <input
                      type="file" accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-zinc-200 rounded-3xl p-10 text-center
                                    transition-all group-hover:border-emerald-400 group-hover:bg-emerald-50/20
                                    flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center
                                      border border-zinc-100 group-hover:scale-110 group-hover:border-emerald-200
                                      group-hover:bg-emerald-50 transition-all duration-500">
                        <Upload className="w-7 h-7 text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-700">Chọn hoặc kéo-thả file</p>
                        <p className="text-[10px] font-bold text-zinc-400 mt-0.5">.xlsx · .xls</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="bg-emerald-50/60 rounded-2xl border border-emerald-100 p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-emerald-100">
                        <FileText className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-zinc-900 truncate">{file.name}</p>
                        <p className="text-[10px] font-bold text-zinc-400">
                          {(file.size / 1024).toFixed(1)} KB &nbsp;·&nbsp; {previewData.length} dòng
                        </p>
                      </div>
                      <button
                        onClick={() => { setFile(null); setPreview([]); setSummary(null); }}
                        className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest"
                      >
                        Xóa
                      </button>
                    </div>

                    <Button
                      onClick={() => mutation.mutate(previewData)}
                      disabled={previewData.length === 0 || mutation.isPending}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black
                                 uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-emerald-100
                                 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                    >
                      {mutation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <><span>Xác nhận Import</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                      }
                    </Button>
                  </div>
                )}

                {/* Notes */}
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-100 space-y-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Info className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-700">Lưu ý</span>
                  </div>
                  {[
                    "Nếu khách hàng, nhóm mã, mã hàng, công đoạn đã tồn tại → hệ thống sẽ giữ nguyên.",
                    "Công đoạn + Định mức sẽ được gom vào đúng Nhóm mã hàng tương ứng.",
                    "Nếu công đoạn trong nhóm đã tồn tại → chỉ cập nhật định mức nếu khác.",
                    "Nhiều dòng cùng nhóm mã trên 1 file → tất cả công đoạn đều được thêm vào nhóm đó.",
                  ].map((note, i) => (
                    <p key={i} className="flex items-start gap-2 text-[10px] font-medium text-amber-800 leading-relaxed">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                      {note}
                    </p>
                  ))}
                </div>

                {/* Column mapping help */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Cột Excel tương ứng</p>
                  {COLUMNS.map(col => (
                    <div key={col.key} className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-100 shrink-0 w-28 truncate">
                        {col.labels[0]}
                      </span>
                      <span className="text-[10px] text-zinc-400">→</span>
                      <span className="text-[10px] font-bold text-indigo-600">{PREVIEW_COLS.find(p => p.key === col.key)?.header}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview / Result Panel */}
        <div className="lg:col-span-8">
          <Card className="border-none shadow-xl shadow-zinc-200/40 rounded-[28px] overflow-hidden bg-white min-h-[520px] flex flex-col">

            {/* ── Sau khi import: Hiển thị kết quả ── */}
            {summary ? (
              <>
                <div className="p-7 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight">Kết quả Import</h3>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">
                        Hoàn thành · Dữ liệu đã được cập nhật
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSummary(null)}
                    className="text-[10px] font-black text-zinc-400 hover:text-zinc-700 uppercase tracking-widest"
                  >
                    Đóng
                  </button>
                </div>

                <div className="flex-1 p-7 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* Tổng quan */}
                  {(() => {
                    const totalCreated = Object.values(summary).reduce((s, v) => s + (v.created || 0), 0);
                    const totalExisting = Object.values(summary).reduce((s, v) => s + (v.existing || 0), 0);
                    const totalUpdated = Object.values(summary).reduce((s, v) => s + (v.updated || 0), 0);
                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 text-center">
                          <p className="text-3xl font-black text-emerald-600 tabular-nums">{totalCreated}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mt-1">Bản ghi mới</p>
                        </div>
                        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-center">
                          <p className="text-3xl font-black text-amber-600 tabular-nums">{totalUpdated}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mt-1">Cập nhật</p>
                        </div>
                        <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4 text-center">
                          <p className="text-3xl font-black text-zinc-500 tabular-nums">{totalExisting}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mt-1">Đã tồn tại</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Chi tiết từng loại */}
                  <div className="rounded-2xl border border-zinc-100 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100">
                          <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-zinc-400">Loại dữ liệu</th>
                          <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-emerald-500">Tạo mới</th>
                          <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-amber-500">Cập nhật</th>
                          <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-zinc-400">Đã có sẵn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {Object.entries(summary).map(([key, val]) => {
                          const cfg = {
                            customers: { label: "Khách hàng", icon: "👤" },
                            product_groups: { label: "Nhóm mã hàng", icon: "📁" },
                            operations: { label: "Công đoạn", icon: "⚙️" },
                            products: { label: "Mã hàng", icon: "📦" },
                            product_group_operations: { label: "Quy trình nhóm", icon: "🔗" },
                          }[key] || { label: key, icon: "•" };
                          const hasActivity = val.created > 0 || val.updated > 0;
                          return (
                            <tr key={key} className={cn("transition-colors", hasActivity ? "bg-white" : "bg-zinc-50/30")}>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-base">{cfg.icon}</span>
                                  <span className="text-sm font-black text-zinc-900">{cfg.label}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {val.created > 0
                                  ? <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-black">+{val.created}</span>
                                  : <span className="text-zinc-300 text-sm font-bold">—</span>
                                }
                              </td>
                              <td className="px-6 py-4 text-center">
                                {val.updated > 0
                                  ? <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-100 text-amber-700 text-sm font-black">~{val.updated}</span>
                                  : <span className="text-zinc-300 text-sm font-bold">—</span>
                                }
                              </td>
                              <td className="px-6 py-4 text-center">
                                {val.existing > 0
                                  ? <span className="text-sm font-bold text-zinc-400 tabular-nums">{val.existing}</span>
                                  : <span className="text-zinc-300 text-sm font-bold">—</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => { setSummary(null); setFile(null); setPreview([]); }}
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="w-3 h-3" /> Import file khác
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-7 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-zinc-950 uppercase tracking-tight">Xem trước dữ liệu</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                      {previewData.length > 0
                        ? `${previewData.length} dòng sẵn sàng để import`
                        : "Chọn file Excel để xem trước"}
                    </p>
                  </div>
                  {previewData.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-xl
                                    bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest">
                      <CheckCircle2 className="w-3 h-3" /> {previewData.length} dòng
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-auto">
                  {isParsing ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Đang đọc file Excel...</p>
                    </div>
                  ) : previewData.length > 0 ? (
                    <>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-100">
                            <th className="px-5 py-4 text-[9px] font-black uppercase text-zinc-400 tracking-widest w-10">#</th>
                            {PREVIEW_COLS.map(col => (
                              <th key={col.key} className="px-5 py-4 text-[9px] font-black uppercase text-zinc-400 tracking-widest">
                                {col.header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                          {previewData.slice(0, 25).map((row, i) => (
                            <tr key={i} className="hover:bg-zinc-50/60 transition-colors">
                              <td className="px-5 py-3.5 text-[10px] font-bold text-zinc-300 tabular-nums">{i + 1}</td>
                              {PREVIEW_COLS.map((col) => (
                                <td key={col.key} className={cn(
                                  "px-5 py-3.5 text-xs",
                                  col.key === "product_group" ? "font-black text-indigo-700" :
                                    col.key === "dinh_muc" ? "font-black text-emerald-600 tabular-nums" :
                                      col.key === "customer" ? "font-bold text-zinc-700" :
                                        "font-medium text-zinc-600"
                                )}>
                                  {row[col.key] ?? <span className="text-zinc-200">—</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {previewData.length > 25 && (
                        <div className="p-5 bg-zinc-50/50 text-center border-t border-zinc-50">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            Và {previewData.length - 25} dòng khác...
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-32 text-center space-y-4">
                      <div className="w-20 h-20 bg-zinc-50 rounded-[24px] flex items-center justify-center border-2 border-dashed border-zinc-100">
                        <FileSpreadsheet className="w-10 h-10 text-zinc-200" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Chưa có dữ liệu</p>
                        <p className="text-[10px] font-bold text-zinc-300 mt-1 uppercase tracking-tighter">
                          Tải file Excel lên để xem trước
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
