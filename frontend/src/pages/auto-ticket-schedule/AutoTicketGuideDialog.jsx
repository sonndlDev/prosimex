import React from "react";
import { ArrowRight, Check, Clock, CircleHelp, CalendarRange, Ban, FilePlus2, ListPlus, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/* ---------- Thành phần sơ đồ dùng chung ---------- */

const STATUS_STYLE = {
  run: { box: "border-emerald-300 bg-emerald-50", badge: "bg-emerald-600 text-white", label: "Job CHẠY" },
  off: { box: "border-rose-300 bg-rose-50", badge: "bg-rose-600 text-white", label: "Job KHÔNG chạy" },
  idle: { box: "border-zinc-200 bg-zinc-50", badge: "bg-zinc-300 text-zinc-800", label: "Không có job" },
};

function DayCard({ date, status, lines }) {
  const style = STATUS_STYLE[status];
  return (
    <div className={`flex w-44 shrink-0 flex-col rounded-lg border-2 p-3 ${style.box}`}>
      <div className="text-base font-bold">{date}</div>
      <span className={`mt-1 w-fit rounded px-2 py-0.5 text-xs font-medium ${style.badge}`}>
        {style.label}
      </span>
      <ul className="mt-2 space-y-1 text-xs text-zinc-700">
        {lines.map((l) => (
          <li key={l}>• {l}</li>
        ))}
      </ul>
    </div>
  );
}

function Timeline({ days }) {
  return (
    <div className="flex flex-wrap items-stretch gap-2 overflow-x-auto pb-1">
      {days.map((d, i) => (
        <React.Fragment key={d.date}>
          <DayCard {...d} />
          {i < days.length - 1 && (
            <div className="flex items-center text-zinc-400">
              <ArrowRight className="h-5 w-5" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function FlowBox({ icon, title, text, tone = "zinc" }) {
  const IconComp = icon;
  const tones = {
    zinc: "border-zinc-300 bg-white",
    blue: "border-blue-300 bg-blue-50",
    emerald: "border-emerald-300 bg-emerald-50",
    rose: "border-rose-300 bg-rose-50",
  };
  return (
    <div className={`flex flex-1 min-w-[180px] flex-col gap-1 rounded-lg border-2 p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-2 font-semibold">
        <IconComp className="h-4 w-4" /> {title}
      </div>
      <p className="text-xs text-zinc-700">{text}</p>
    </div>
  );
}

/* ---------- Nội dung ---------- */

const FORM_EXAMPLE_TIMELINE = [
  { date: "23/11", status: "run", lines: ["Tạo phiếu 24/11 (mặc định)", "Tạo phiếu 25/11 (quy tắc)"] },
  { date: "24/11", status: "off", lines: ["Tự bỏ qua: không tạo phiếu 25/11 mặc định"] },
  { date: "25/11", status: "run", lines: ["Tạo phiếu 26/11 (mặc định)"] },
  { date: "26/11", status: "idle", lines: ["Phiếu 26/11 do job 25/11 tạo"] },
];

const EXAMPLES = [
  {
    title: "1. Chiều 23/11 tạo phiếu cho 24/11 và 25/11, không chạy job 24/11",
    setup: "1 quy tắc: Tạo thêm phiếu · Ngày chạy 23/11 · Tạo job cho 24/11, 25/11 (hệ thống tự bỏ qua 24/11)",
    days: FORM_EXAMPLE_TIMELINE,
  },
  {
    title: "2. Chỉ bỏ job ngày 24/11",
    setup: "1 quy tắc: Không chạy job · Ngày chạy 24/11",
    days: [
      { date: "23/11", status: "run", lines: ["Tạo phiếu 24/11 (mặc định)"] },
      { date: "24/11", status: "off", lines: ["Bỏ qua, không tạo phiếu 25/11"] },
      { date: "25/11", status: "idle", lines: ["Không có phiếu từ job 24/11"] },
    ],
  },
  {
    title: "3. Bỏ cả khoảng 24/11 → 26/11 bằng một quy tắc",
    setup: "1 quy tắc: Không chạy job · Ngày chạy 24/11 → 26/11",
    days: [
      { date: "23/11", status: "run", lines: ["Tạo phiếu 24/11 (mặc định)"] },
      { date: "24/11", status: "off", lines: ["Job bị bỏ qua"] },
      { date: "25/11", status: "off", lines: ["Job bị bỏ qua"] },
      { date: "26/11", status: "off", lines: ["Job bị bỏ qua"] },
    ],
  },
  {
    title: "4. Nhiều ngày chạy, cùng tạo phiếu cho 26/11",
    setup: "1 quy tắc: Tạo thêm phiếu · Ngày chạy 23/11 → 24/11 · Tạo job cho 26/11 (hệ thống tự bỏ qua 25/11)",
    days: [
      { date: "23/11", status: "run", lines: ["Tạo phiếu 24/11 (mặc định)", "Tạo phiếu 26/11 (quy tắc)"] },
      { date: "24/11", status: "run", lines: ["Tạo phiếu 25/11 (mặc định)", "26/11 đã có → bỏ qua"] },
      { date: "25/11", status: "off", lines: ["Tự bỏ qua: không tạo 26/11 mặc định"] },
      { date: "26/11", status: "idle", lines: ["Phiếu 26/11 do quy tắc tạo"] },
    ],
  },
  {
    title: "5. Nhập form đúng cho trường hợp chiều 23/11 tạo 24/11 và 25/11, không chạy 24/11",
    setup: "Tạo 1 quy tắc duy nhất với các giá trị bên dưới",
    form: [
      ["Loại quy tắc", "Tạo thêm phiếu"],
      ["Ngày chạy job", "23/11/2026 (ô đến để trống)"],
      ["Tạo job cho ngày nào", "24/11/2026, 25/11/2026"],
      ["Bỏ qua ngày nào (tự động)", "24/11/2026 (hệ thống tự tính, không cần nhập)"],
      ["Ghi chú", "tùy chọn"],
    ],
    days: FORM_EXAMPLE_TIMELINE,
  },
];

const FIELDS = [
  {
    icon: CircleHelp,
    name: "Loại quy tắc",
    plain: "Bạn muốn làm gì?",
    items: [
      "Tạo thêm phiếu: tạo thêm phiếu cho các ngày bạn chọn.",
      "Không chạy job: bỏ qua job vào các ngày chạy đã chọn.",
    ],
  },
  {
    icon: Clock,
    name: "Ngày chạy job",
    plain: "Job chạy vào ngày nào thì quy tắc có tác dụng?",
    items: ["Ô 'đến' để trống nếu chỉ một ngày."],
  },
  {
    icon: ListPlus,
    name: "Tạo job cho ngày nào",
    plain: "Các ngày sẽ có phiếu được tạo thêm (chỉ với 'Tạo thêm phiếu').",
    items: [
      "Chọn từng ngày rồi bấm 'Thêm ngày'. Các ngày không cần liền nhau.",
      "Không được trùng với 'Ngày chạy job'.",
    ],
  },
  {
    icon: Ban,
    name: "Bỏ qua ngày nào (tự động)",
    plain: "Hệ thống tự tính, bạn không cần nhập.",
    items: [
      "Nếu ngày tạo job là 25/11 thì job ngày 24/11 sẽ không tạo phiếu mặc định, vì 25/11 đã được tạo từ ngày chạy.",
      "Ví dụ: chạy 23/11, tạo cho 24/11 và 25/11 → tự bỏ qua 24/11.",
    ],
  },
  {
    icon: Lightbulb,
    name: "Ghi chú",
    plain: "Nội dung tự do để ghi lý do, ví dụ 'Nghỉ lễ'.",
    items: ["Không ảnh hưởng cách job chạy."],
  },
  {
    icon: CalendarRange,
    name: "Trạng thái và Tình trạng",
    plain: "Quy tắc đang bật hay tắt, và job đã chạy chưa?",
    items: [
      "Active: quy tắc đang được áp dụng. Hide: lưu lại nhưng không áp dụng.",
      "Đang chờ / Đang chạy / Đã chạy: hệ thống tự cập nhật.",
    ],
  },
];

const NOTES = [
  "Thay đổi có hiệu lực ở lần job chạy tiếp theo, không cần restart server.",
  "Xóa là xóa mềm: quy tắc không còn ảnh hưởng nhưng dữ liệu vẫn được lưu.",
  "Không thể thêm trùng một quy tắc đang hoạt động (cùng loại, cùng ngày).",
  "Mỗi quy tắc tối đa 60 ngày tạo job.",
  "Mặc định: job ngày nào cũng tạo phiếu cho ngày mai. Chủ nhật không chạy. Thứ 7 từ 12h tạo cho Chủ nhật và Thứ 2.",
  "Nút 'Tạo phiếu thủ công' ở màn Phiếu SX không đọc các quy tắc này.",
];

/* ---------- Component ---------- */

export default function AutoTicketGuideDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hướng dẫn Lịch tạo phiếu tự động</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-col">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="diagrams">Sơ đồ ví dụ</TabsTrigger>
            <TabsTrigger value="fields">Các trường</TabsTrigger>
            <TabsTrigger value="notes">Lưu ý</TabsTrigger>
          </TabsList>

          {/* Tổng quan: job chạy thế nào */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <p className="text-sm text-zinc-700">
              Mỗi ngày lúc <b>15:00</b>, hệ thống chạy một job. Job này tạo phiếu sản xuất cho ngày mai,
              trừ khi có quy tắc bạn đặt ra. Quy tắc chỉ thay đổi việc <b>tạo thêm</b> phiếu hoặc <b>bỏ</b> job.
            </p>

            <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
              <FlowBox icon={Clock} title="1. 15:00 mỗi ngày" text="Job tự động được kích hoạt." tone="blue" />
              <div className="hidden items-center md:flex"><ArrowRight className="h-5 w-5 text-zinc-400" /></div>
              <FlowBox
                icon={CircleHelp}
                title="2. Hôm nay có bị 'Không chạy' không?"
                text="Xem các quy tắc Active."
              />
              <div className="hidden items-center md:flex"><ArrowRight className="h-5 w-5 text-zinc-400" /></div>
              <div className="flex flex-1 flex-col gap-3">
                <FlowBox icon={Ban} title="Có → Dừng" text="Không tạo phiếu nào hôm nay." tone="rose" />
                <FlowBox
                  icon={FilePlus2}
                  title="Không → Tạo phiếu"
                  text="Tạo phiếu cho ngày mai, và thêm các ngày 'Tạo job cho ngày nào' của quy tắc Active."
                  tone="emerald"
                />
              </div>
            </div>

            <div className="rounded-lg border bg-zinc-50 p-3 text-sm">
              <div className="font-semibold">Quan trọng</div>
              <p className="text-zinc-700">
                Quy tắc không có tác dụng ngay lập tức. Nó chỉ được áp dụng khi job chạy ở ngày đó.
                Ví dụ: "Không chạy 24/11" chỉ có tác dụng lúc 15:00 ngày 24/11, không xóa phiếu đã tạo trước đó.
              </p>
            </div>
          </TabsContent>

          {/* Sơ đồ ví dụ */}
          <TabsContent value="diagrams" className="mt-4 space-y-6">
            <p className="text-sm text-zinc-700">
              Mỗi khối là một ví dụ. Các ô là từng ngày, mũi tên nghĩa là "ngày kế tiếp".
              <span className="ml-1 inline-flex items-center gap-1">
                <Badge className="bg-emerald-600">Job CHẠY</Badge> <Badge className="bg-rose-600">Job KHÔNG chạy</Badge>
              </span>
            </p>
            {EXAMPLES.map((ex) => (
              <div key={ex.title} className="space-y-2 rounded-lg border p-4">
                <div className="font-semibold">{ex.title}</div>
                <div className="text-xs text-zinc-500">Cách tạo: {ex.setup}</div>
                {ex.form && (
                  <table className="w-full max-w-md text-xs">
                    <tbody>
                      {ex.form.map(([label, value]) => (
                        <tr key={label} className="border-t">
                          <td className="py-1 pr-3 text-zinc-600">{label}</td>
                          <td className="py-1 font-medium">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <Timeline days={ex.days} />
              </div>
            ))}
          </TabsContent>

          {/* Các trường */}
          <TabsContent value="fields" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2">
              {FIELDS.map((f) => {
                const FieldIcon = f.icon;
                return (
                  <div key={f.name} className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 font-semibold">
                      <FieldIcon className="h-4 w-4 text-zinc-500" /> {f.name}
                    </div>
                    <p className="mt-1 text-sm font-medium text-zinc-800">{f.plain}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600">
                      {f.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Lưu ý */}
          <TabsContent value="notes" className="mt-4">
            <ul className="space-y-2 text-sm">
              {NOTES.map((note) => (
                <li key={note} className="flex gap-2 rounded-md border p-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
