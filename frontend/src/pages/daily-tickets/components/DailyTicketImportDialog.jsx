import React, { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle,
  Loader2, AlertTriangle, RotateCcw, Download,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { dailyTicketService } from "../../../services/daily-ticket.service";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function TablePagination({ page, totalItems, onPageChange }) {
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  if (totalPages <= 1) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, totalItems);
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-100 bg-white shrink-0">
      <span className="text-xs text-zinc-400 font-semibold tabular-nums">
        {from}–{to} / <span className="text-zinc-600 font-black">{totalItems}</span> dòng
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce((acc, p, idx, arr) => {
            if (idx > 0 && arr[idx - 1] !== p - 1) acc.push("…");
            acc.push(p);
            return acc;
          }, [])
          .map((p, idx) =>
            p === "…" ? (
              <span key={`ellipsis-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs text-zinc-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-colors",
                  p === page
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
              >
                {p}
              </button>
            )
          )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function downloadTemplate() {
  const headers = ["Mã Phiếu", "Mã SP", "Công đoạn", "SL Thực tế", "Ghi chú TT"];
  const examples = [
    {
      "Mã Phiếu": "2025100812",
      "Mã SP": "MH001",
      "Công đoạn": "Cắt phôi",
      "SL Thực tế": 480,
      "Ghi chú TT": "",
    },
    {
      "Mã Phiếu": "2025100812",
      "Mã SP": "MH001",
      "Công đoạn": "Hàn",
      "SL Thực tế": 460,
      "Ghi chú TT": "Máy hàn bị chậm",
    },
    {
      "Mã Phiếu": "2025100834",
      "Mã SP": "MH002",
      "Công đoạn": "Cắt phôi",
      "SL Thực tế": 200,
      "Ghi chú TT": "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(examples, { header: headers });

  // Ép cột Mã Phiếu thành kiểu TEXT để Excel không chuyển sang dạng 2.0267E+11
  const maPHieuCol = 0;
  // Các dòng mẫu
  examples.forEach((_, ri) => {
    const ref = XLSX.utils.encode_cell({ r: ri + 1, c: maPHieuCol });
    if (ws[ref]) { ws[ref].t = 's'; ws[ref].z = '@'; ws[ref].v = String(ws[ref].v); }
  });
  // Thêm 20 dòng trống đã định dạng text sẵn để user nhập vào
  for (let ri = examples.length + 1; ri <= examples.length + 20; ri++) {
    const ref = XLSX.utils.encode_cell({ r: ri, c: maPHieuCol });
    ws[ref] = { v: '', t: 's', z: '@' };
  }
  // Mở rộng vùng sheet
  const sheetRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  sheetRange.e.r = Math.max(sheetRange.e.r, examples.length + 20);
  ws['!ref'] = XLSX.utils.encode_range(sheetRange);

  // Tô màu header
  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "166534" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
  };
  const noteStyle = {
    fill: { fgColor: { rgb: "FEF9C3" } },
    font: { italic: true, color: { rgb: "92400E" } },
    alignment: { wrapText: true },
  };

  // Áp dụng style cho header row
  headers.forEach((_, ci) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (ws[cellRef]) ws[cellRef].s = headerStyle;
  });

  // Đánh dấu cột "SL Thực tế" và "Ghi chú TT" là cần điền
  const slCol = headers.indexOf("SL Thực tế");
  const noteCol = headers.indexOf("Ghi chú TT");
  examples.forEach((_, ri) => {
    [slCol, noteCol].forEach((ci) => {
      const ref = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      if (ws[ref]) ws[ref].s = noteStyle;
    });
  });

  // Độ rộng cột
  ws["!cols"] = [
    { wch: 18 }, // Mã Phiếu
    { wch: 16 }, // Mã SP
    { wch: 22 }, // Công đoạn
    { wch: 14 }, // SL Thực tế
    { wch: 28 }, // Ghi chú TT
  ];

  // Sheet ghi chú hướng dẫn
  const guide = [
    ["HƯỚNG DẪN SỬ DỤNG TEMPLATE"],
    [""],
    ["Cột", "Mô tả", "Bắt buộc"],
    ["Mã Phiếu", "Sao chép từ cột 'Mã Phiếu' khi xuất Excel — KHÔNG sửa", "Có"],
    ["Mã SP", "Tên mã hàng (phải khớp chính xác với hệ thống)", "Có"],
    ["Công đoạn", "Tên công đoạn (phải khớp chính xác với hệ thống)", "Có"],
    ["SL Thực tế", "Số lượng thực tế sản xuất được — CỘT CẦN ĐIỀN", "Có"],
    ["Ghi chú TT", "Ghi chú thực tế (tuỳ chọn)", "Không"],
    [""],
    ["Lưu ý:"],
    ["- Không xoá hay đổi tên các cột tiêu đề"],
    ["- Mã Phiếu gồm 8 chữ số ngày (yyyyMMdd) + ID phiếu, ví dụ: 2025100812"],
    ["- Một phiếu có thể có nhiều dòng (mỗi dòng là một mã hàng / công đoạn)"],
    ["- Phiếu đã chốt (COMPLETED) sẽ bị bỏ qua"],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  wsGuide["!cols"] = [{ wch: 20 }, { wch: 50 }, { wch: 12 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Import");
  XLSX.utils.book_append_sheet(wb, wsGuide, "Hướng dẫn");

  XLSX.writeFile(wb, "Template_Import_SL_TT.xlsx");
}

const COLUMN_MAP = [
  { key: "ma_phieu",   labels: ["Mã Phiếu", "Ma Phieu"] },
  { key: "ma_sp",      labels: ["Mã SP", "Ma SP"] },
  { key: "cong_doan",  labels: ["Công đoạn", "Cong doan", "Công Đoạn"] },
  { key: "sl_thuc_te", labels: ["SL Thực tế", "SL Thuc te", "SL TT"] },
  { key: "ghi_chu_tt", labels: ["Ghi chú TT", "Ghi Chu TT"] },
];

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const headers = (raw[0] || []).map((h) => String(h || "").trim());

        const idxMap = {};
        COLUMN_MAP.forEach((col) => {
          idxMap[col.key] = headers.findIndex((h) =>
            col.labels.some((l) => h.toLowerCase() === l.toLowerCase())
          );
        });

        const required = COLUMN_MAP.filter((c) => c.key !== "ghi_chu_tt");
        const missing = required.filter((c) => idxMap[c.key] === -1).map((c) => c.labels[0]);
        if (missing.length > 0) {
          reject(new Error(`File thiếu cột bắt buộc: ${missing.join(", ")}`));
          return;
        }

        const rows = raw
          .slice(1)
          .filter((r) => r.some((c) => c !== undefined && c !== ""))
          .map((r) => {
            const obj = {};
            COLUMN_MAP.forEach((col) => {
              const idx = idxMap[col.key];
              const val = idx >= 0 ? r[idx] : undefined;
              if (val === null || val === undefined || String(val).trim() === "") {
                obj[col.key] = null;
                return;
              }
              if (col.key === "ma_phieu") {
                // Excel may store large codes as a JS number or as scientific notation string
                if (typeof val === "number") {
                  obj[col.key] = Math.round(val).toString();
                } else {
                  const str = String(val).trim();
                  obj[col.key] = /^[\d.]+[eE][+\-]?\d+$/.test(str)
                    ? Math.round(parseFloat(str)).toString()
                    : str;
                }
              } else {
                obj[col.key] = String(val).trim();
              }
            });
            return obj;
          })
          .filter((r) => r.ma_phieu || r.ma_sp);

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsArrayBuffer(file);
  });
}

export default function DailyTicketImportDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);

  const [stage, setStage] = useState("idle"); // idle | preview | result
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resultFilter, setResultFilter] = useState("all"); // all | success | failed
  const [previewPage, setPreviewPage] = useState(1);
  const [resultPage, setResultPage] = useState(1);

  const importMutation = useMutation({
    mutationFn: (rows) => dailyTicketService.importResults(rows),
    onSuccess: (data) => {
      setImportResult(data);
      setStage("result");
      queryClient.invalidateQueries(["daily-tickets"]);
      if (data.summary.failed === 0) {
        toast.success(`Import thành công ${data.summary.success} dòng!`);
      } else {
        toast.warning(`Import xong: ${data.summary.success} thành công, ${data.summary.failed} lỗi.`);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Lỗi khi import");
    },
  });

  const handleFile = async (file) => {
    if (!file) return;
    setParseError(null);
    try {
      const rows = await parseExcel(file);
      if (rows.length === 0) {
        setParseError("File không có dữ liệu hợp lệ.");
        return;
      }
      setParsedRows(rows);
      setStage("preview");
    } catch (err) {
      setParseError(err.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleReset = () => {
    setStage("idle");
    setParsedRows([]);
    setParseError(null);
    setImportResult(null);
    setResultFilter("all");
    setPreviewPage(1);
    setResultPage(1);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col p-0 border-zinc-200 shadow-2xl">

        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-white border-b border-zinc-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-xl shadow-md shadow-emerald-100">
                <FileSpreadsheet className="h-4 w-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-black tracking-tight text-zinc-950">
                  Import SL Thực Tế từ Excel
                </DialogTitle>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Cập nhật sản lượng hàng loạt từ file xuất
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stage !== "idle" && (
                <Button variant="ghost" size="sm" onClick={handleReset}
                  className="h-8 px-3 text-zinc-500 hover:text-zinc-900 gap-1.5 text-xs font-bold">
                  <RotateCcw className="w-3.5 h-3.5" /> Làm lại
                </Button>
              )}
              <Button variant="ghost" onClick={handleClose}
                className="h-8 px-4 font-bold text-zinc-500 hover:text-zinc-900 text-xs">
                Đóng
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">

          {/* ── idle: upload zone ─────────────────────────────────── */}
          {stage === "idle" && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "w-full max-w-lg border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all",
                  isDragging
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                )}
              >
                <div className={cn("p-4 rounded-2xl transition-all", isDragging ? "bg-emerald-100" : "bg-zinc-100")}>
                  <Upload className={cn("w-8 h-8 transition-colors", isDragging ? "text-emerald-600" : "text-zinc-400")} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-zinc-700">Kéo file vào đây hoặc click để chọn</p>
                  <p className="text-xs text-zinc-400 mt-1">File Excel (.xlsx, .xls) — xuất từ trang Phiếu Sản Xuất</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>

              {parseError && (
                <div className="flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 max-w-lg w-full">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {parseError}
                </div>
              )}

              <div className="flex flex-col items-center gap-3">
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="h-9 px-5 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 rounded-xl font-bold text-xs gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải template mẫu (.xlsx)
                </Button>
                <div className="text-xs text-zinc-400 text-center space-y-1 max-w-sm">
                  <p className="font-bold text-zinc-500">Cách dùng:</p>
                  <p>1. Xuất Excel từ trang Phiếu Sản Xuất <span className="text-zinc-500 font-semibold">(hoặc dùng template mẫu)</span></p>
                  <p>2. Điền cột <span className="font-bold text-zinc-700">"SL Thực tế"</span> và <span className="font-bold text-zinc-700">"Ghi chú TT"</span></p>
                  <p>3. Import file lại vào đây</p>
                </div>
              </div>
            </div>
          )}

          {/* ── preview: xem trước ────────────────────────────────── */}
          {stage === "preview" && (() => {
            const previewRows = parsedRows.slice((previewPage - 1) * PAGE_SIZE, previewPage * PAGE_SIZE);
            return (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-sm font-bold text-zinc-700">
                      Đọc được <span className="text-emerald-600 font-black">{parsedRows.length}</span> dòng — xem lại trước khi import
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Kiểm tra dữ liệu bên dưới, sau đó nhấn Import để tiến hành</p>
                  </div>
                  <Button
                    onClick={() => importMutation.mutate(parsedRows)}
                    disabled={importMutation.isPending}
                    className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg gap-2 shadow-sm shadow-emerald-200"
                  >
                    {importMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Đang import...</>
                      : <><Upload className="w-4 h-4" />Import {parsedRows.length} dòng</>}
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-zinc-50 sticky top-0 z-10 border-b border-zinc-200">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left font-black text-zinc-400 uppercase tracking-wider text-xs">#</th>
                        <th className="px-5 py-3 text-left font-black text-zinc-400 uppercase tracking-wider text-xs whitespace-nowrap">Mã Phiếu</th>
                        <th className="px-5 py-3 text-left font-black text-zinc-400 uppercase tracking-wider text-xs">Mã SP</th>
                        <th className="px-5 py-3 text-left font-black text-zinc-400 uppercase tracking-wider text-xs">Công đoạn</th>
                        <th className="px-5 py-3 text-right font-black text-zinc-400 uppercase tracking-wider text-xs whitespace-nowrap">SL TT</th>
                        <th className="px-5 py-3 text-left font-black text-zinc-400 uppercase tracking-wider text-xs">Ghi chú TT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {previewRows.map((r, i) => {
                        const globalIdx = (previewPage - 1) * PAGE_SIZE + i + 1;
                        return (
                          <tr key={i} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-4 py-3.5 text-zinc-400 font-bold tabular-nums text-sm border-l-[3px] border-transparent">{globalIdx}</td>
                            <td className="px-5 py-3.5 font-mono font-semibold text-zinc-700 text-sm tracking-wide">
                              {r.ma_phieu || <span className="text-red-400 font-bold">—</span>}
                            </td>
                            <td className="px-5 py-3.5 font-semibold text-zinc-800">{r.ma_sp || "—"}</td>
                            <td className="px-5 py-3.5 text-zinc-600">{r.cong_doan || "—"}</td>
                            <td className={cn("px-5 py-3.5 text-right font-black tabular-nums",
                              r.sl_thuc_te ? "text-blue-600" : "text-zinc-300")}>
                              {r.sl_thuc_te ?? "—"}
                            </td>
                            <td className="px-5 py-3.5 text-zinc-400 italic text-xs">{r.ghi_chu_tt || ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </ScrollArea>
                <TablePagination page={previewPage} totalItems={parsedRows.length} onPageChange={setPreviewPage} />
              </div>
            );
          })()}

          {/* ── result: kết quả import ───────────────────────────── */}
          {stage === "result" && importResult && (() => {
            const allSuccess = importResult.summary.failed === 0;
            const filteredRows = importResult.results.filter((r) =>
              resultFilter === "all" ? true : resultFilter === "success" ? r.success : !r.success
            );
            const visibleRows = filteredRows.slice((resultPage - 1) * PAGE_SIZE, resultPage * PAGE_SIZE);
            return (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Summary banner */}
                <div className={cn(
                  "px-6 py-4 shrink-0 border-b",
                  allSuccess ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
                )}>
                  <div className="flex items-center gap-2.5 mb-3">
                    {allSuccess
                      ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      : <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                    }
                    <p className={cn("font-black text-sm", allSuccess ? "text-emerald-800" : "text-amber-800")}>
                      {allSuccess
                        ? "Import thành công toàn bộ!"
                        : `Import xong — ${importResult.summary.failed} dòng có lỗi, cần kiểm tra lại`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 shadow-sm">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Tổng</span>
                      <span className="text-sm font-black text-zinc-700 tabular-nums">{importResult.summary.total}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-1.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-sm font-black text-emerald-600 tabular-nums">{importResult.summary.success}</span>
                      <span className="text-[11px] font-bold text-zinc-400">thành công</span>
                    </div>
                    {importResult.summary.failed > 0 && (
                      <div className="flex items-center gap-2 bg-white border border-red-200 rounded-lg px-3 py-1.5 shadow-sm">
                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="text-sm font-black text-red-600 tabular-nums">{importResult.summary.failed}</span>
                        <span className="text-[11px] font-bold text-zinc-400">lỗi</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Filter bar */}
                <div className="px-6 py-3 bg-white border-b border-zinc-100 flex items-center gap-2 shrink-0">
                  {[
                    { key: "all", label: "Tất cả", count: importResult.summary.total },
                    { key: "success", label: "Thành công", count: importResult.summary.success },
                    { key: "failed", label: "Lỗi", count: importResult.summary.failed },
                  ].filter((f) => !(f.key === "failed" && f.count === 0)).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => { setResultFilter(f.key); setResultPage(1); }}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all",
                        resultFilter === f.key
                          ? f.key === "failed"
                            ? "bg-red-100 text-red-700"
                            : f.key === "success"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-zinc-900 text-white"
                          : "text-zinc-500 hover:bg-zinc-100"
                      )}
                    >
                      {f.label}
                      <span className={cn(
                        "text-[10px] font-black rounded-full px-1.5 py-px tabular-nums",
                        resultFilter === f.key
                          ? f.key === "failed" ? "bg-red-200 text-red-800"
                            : f.key === "success" ? "bg-emerald-200 text-emerald-800"
                            : "bg-white/20 text-white"
                          : "bg-zinc-200 text-zinc-600"
                      )}>{f.count}</span>
                    </button>
                  ))}
                </div>

                {/* Table */}
                <ScrollArea className="flex-1">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-zinc-50 sticky top-0 z-10 border-b border-zinc-200">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left font-black text-zinc-400 uppercase tracking-wider text-xs">#</th>
                        <th className="px-5 py-3 text-left font-black text-zinc-400 uppercase tracking-wider text-xs whitespace-nowrap">Mã Phiếu</th>
                        <th className="px-5 py-3 text-left font-black text-zinc-400 uppercase tracking-wider text-xs">Mã SP</th>
                        <th className="px-5 py-3 text-left font-black text-zinc-400 uppercase tracking-wider text-xs">Công đoạn</th>
                        <th className="px-5 py-3 text-right font-black text-zinc-400 uppercase tracking-wider text-xs whitespace-nowrap">SL TT</th>
                        <th className="px-5 py-3 text-left font-black text-zinc-400 uppercase tracking-wider text-xs">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {visibleRows.map((r) => (
                        <tr key={r.row} className={cn(
                          "transition-colors",
                          r.success ? "hover:bg-emerald-50/40" : "hover:bg-red-50/40"
                        )}>
                          <td className={cn(
                            "px-4 py-3.5 font-bold tabular-nums text-sm border-l-[3px]",
                            r.success ? "text-zinc-400 border-emerald-400" : "text-zinc-400 border-red-400"
                          )}>{r.row}</td>
                          <td className="px-5 py-3.5 font-mono text-sm font-semibold text-zinc-700 tracking-wide">{r.ma_phieu || "—"}</td>
                          <td className="px-5 py-3.5 font-semibold text-sm text-zinc-800">{r.ma_sp || "—"}</td>
                          <td className="px-5 py-3.5 text-sm text-zinc-600">{r.cong_doan || "—"}</td>
                          <td className="px-5 py-3.5 text-right font-black tabular-nums text-sm text-zinc-700">{r.sl_thuc_te ?? "—"}</td>
                          <td className="px-5 py-3.5 max-w-[320px]">
                            {r.success ? (
                              <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 font-bold rounded-md px-2.5 py-1 text-xs whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Thành công
                              </span>
                            ) : (
                              <span className="inline-flex items-start gap-2 text-red-600 font-semibold text-xs">
                                <XCircle className="w-4 h-4 shrink-0 mt-px" />
                                <span className="leading-snug">{r.error}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {visibleRows.length === 0 && (
                    <div className="py-12 text-center text-xs text-zinc-400 font-semibold">
                      Không có dòng nào
                    </div>
                  )}
                </ScrollArea>
                <TablePagination page={resultPage} totalItems={filteredRows.length} onPageChange={setResultPage} />
              </div>
            );
          })()}

        </div>
      </DialogContent>
    </Dialog>
  );
}
