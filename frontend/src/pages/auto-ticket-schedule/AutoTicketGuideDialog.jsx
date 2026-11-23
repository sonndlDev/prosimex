import React from "react";
import { Check, CalendarDays, ListChecks, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const FIELDS = [
  {
    name: "Loại quy tắc",
    desc: "Chọn một trong hai loại.",
    items: [
      { label: "Không chạy job", text: "Job của mọi ngày trong khoảng bị bỏ qua, không tạo phiếu nào." },
      { label: "Tạo thêm phiếu", text: "Giữ lịch mặc định, tạo thêm phiếu cho ngày tạo phiếu và cho phép khai báo ngày không chạy." },
    ],
  },
  {
    name: "Ngày chạy job (từ / đến)",
    desc: "Ngày job tự động (15:00 giờ Việt Nam) được kích hoạt. Để trống 'đến' nếu chỉ một ngày.",
    items: [
      { label: "Không chạy job", text: "Các ngày trong khoảng sẽ bị bỏ qua." },
      { label: "Tạo thêm phiếu", text: "Job chạy ở mỗi ngày trong khoảng và đều tạo thêm phiếu." },
    ],
  },
  {
    name: "Ngày tạo phiếu (từ / đến)",
    desc: "Các ngày sẽ có phiếu được tạo thêm. Chỉ nhập khi chọn 'Tạo thêm phiếu'.",
    items: [{ label: "Lưu ý", text: "Không được trùng với khoảng 'Ngày chạy job'." }],
  },
  {
    name: "Ngày không chạy job (từ / đến)",
    desc: "Chỉ có với 'Tạo thêm phiếu'. Các ngày job bị bỏ qua, giúp gộp cả 'Không chạy job' vào cùng một quy tắc.",
    items: [
      { label: "Lưu ý", text: "Không được trùng với khoảng 'Ngày chạy job' của cùng quy tắc." },
      { label: "Phạm vi", text: "Khi quy tắc đang Active, job các ngày này không chạy." },
    ],
  },
  {
    name: "Ghi chú",
    desc: "Nội dung tự do để ghi lý do, ví dụ 'Nghỉ lễ'. Không ảnh hưởng cách job chạy.",
    items: [],
  },
  {
    name: "Trạng thái (Active / Hide)",
    desc: "Bật/tắt việc áp dụng quy tắc bằng công tắc trong bảng.",
    items: [
      { label: "Active", text: "Quy tắc được job áp dụng." },
      { label: "Hide", text: "Quy tắc vẫn được lưu nhưng job bỏ qua." },
    ],
  },
  {
    name: "Tình trạng",
    desc: "Hệ thống tự cập nhật khi job chạy. Chỉ áp dụng cho quy tắc Active.",
    items: [
      { label: "Đang chờ", text: "Chưa tới ngày chạy job." },
      { label: "Đang chạy", text: "Job của ngày này đang thực thi." },
      { label: "Đã chạy", text: "Job đã chạy xong (kể cả quy tắc 'Không chạy job')." },
    ],
  },
];

const EXAMPLES = [
  {
    title: "Chiều 23/11 tạo phiếu cho 24/11 và 25/11, không chạy job 24/11 (1 quy tắc)",
    rules: [
      { type: "Tạo thêm phiếu", run: "23/11", target: "24/11 → 25/11", skip: "24/11" },
    ],
    result: "Chiều 23/11 job tạo phiếu cho 24/11 và 25/11. Job ngày 24/11 không chạy.",
  },
  {
    title: "Không chạy job ngày 24/11",
    rules: [{ type: "Không chạy job", run: "24/11", target: "-", skip: "-" }],
    result: "Job của 24/11 bị bỏ qua.",
  },
  {
    title: "Bỏ qua cả khoảng bằng một quy tắc",
    rules: [{ type: "Không chạy job", run: "24/11 → 26/11", target: "-", skip: "-" }],
    result: "Job của cả 3 ngày 24, 25, 26/11 bị bỏ qua.",
  },
  {
    title: "Nhiều ngày chạy, mỗi ngày tạo cùng một khoảng phiếu",
    rules: [
      { type: "Tạo thêm phiếu", run: "23/11 → 24/11", target: "26/11", skip: "-" },
    ],
    result: "Job 23/11 và 24/11 đều tạo phiếu cho 26/11. Phiếu đã có của máy nào thì không tạo lại.",
  },
];

const NOTES = [
  "Thay đổi có hiệu lực ở lần job chạy tiếp theo, không cần restart server.",
  "Xóa là xóa mềm: quy tắc không còn ảnh hưởng nhưng dữ liệu vẫn được lưu.",
  "Không thể thêm trùng một quy tắc đang hoạt động (cùng loại, cùng ngày).",
  "Mỗi khoảng ngày tối đa 90 ngày.",
  "Chủ nhật job không chạy theo mặc định. Thứ 7 từ 12h đã tạo cho cả Chủ nhật và Thứ 2.",
  "Nút 'Tạo phiếu thủ công' ở màn Phiếu SX không đọc các quy tắc này.",
];

export default function AutoTicketGuideDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hướng dẫn Lịch tạo phiếu tự động</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="fields" className="flex-col">
          <TabsList>
            <TabsTrigger value="fields">
              <ListChecks className="mr-1 h-4 w-4" /> Các trường
            </TabsTrigger>
            <TabsTrigger value="examples">
              <CalendarDays className="mr-1 h-4 w-4" /> Ví dụ
            </TabsTrigger>
            <TabsTrigger value="notes">
              <Lightbulb className="mr-1 h-4 w-4" /> Lưu ý
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2">
              {FIELDS.map((field) => (
                <div key={field.name} className="rounded-lg border bg-card p-4">
                  <div className="font-semibold">{field.name}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{field.desc}</p>
                  {field.items.length > 0 && (
                    <dl className="mt-3 space-y-2 text-sm">
                      {field.items.map((item) => (
                        <div key={item.label} className="flex gap-2">
                          <dt className="shrink-0">
                            <Badge variant="outline">{item.label}</Badge>
                          </dt>
                          <dd className="text-muted-foreground">{item.text}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="examples" className="mt-4">
            <div className="grid gap-3">
              {EXAMPLES.map((ex, idx) => (
                <div key={ex.title} className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {idx + 1}
                    </span>
                    {ex.title}
                  </div>
                  <table className="mt-3 w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="pb-1 font-medium">Loại</th>
                        <th className="pb-1 font-medium">Ngày chạy job</th>
                        <th className="pb-1 font-medium">Ngày tạo phiếu</th>
                        <th className="pb-1 font-medium">Ngày không chạy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.rules.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="py-1.5">{r.type}</td>
                          <td className="py-1.5">{r.run}</td>
                          <td className="py-1.5">{r.target}</td>
                          <td className="py-1.5">{r.skip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Kết quả: </span>
                    {ex.result}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

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
