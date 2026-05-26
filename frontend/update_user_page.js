import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function processUserPage() {
    const filePath = path.resolve(__dirname, 'src/pages/auth/UserPage.jsx');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. max-w-3xl -> max-w-5xl
    content = content.replace('className="max-w-3xl p-0', 'className="max-w-5xl p-0');
    
    // 2. Left column flex-1 -> w-[320px] md:w-[400px] flex-shrink-0
    content = content.replace(
        '<div className="flex-1 p-6 space-y-6 overflow-y-auto border-r border-zinc-100 bg-white">',
        '<div className="w-full md:w-[400px] flex-shrink-0 p-6 space-y-6 overflow-y-auto border-r border-zinc-100 bg-white">'
    );
    
    // 3. Right column
    const oldRightColumn = `<div className="w-full md:w-[320px] bg-zinc-50 p-6 overflow-y-auto space-y-6">
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
                </div>`;
                
    const newRightColumn = `<div className="flex-1 bg-zinc-50 p-6 overflow-y-auto space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Danh mục truy cập chi tiết</p>
                  <Badge variant="outline" className="text-[10px] border-zinc-200 text-zinc-400 bg-white">Ma trận phân quyền</Badge>
                </div>
                <div className="space-y-6">
                  {PERMISSION_GROUPS.map(group => (
                    <div key={group.groupLabel} className="space-y-3">
                      <p className="text-[12px] font-black text-indigo-700 tracking-widest uppercase">{group.groupLabel}</p>
                      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-zinc-100/50 border-b border-zinc-200">
                            <tr>
                              <th className="p-3 pl-4 font-bold text-zinc-500 uppercase tracking-wider">Chức năng</th>
                              <th className="p-3 font-bold text-zinc-500 text-center uppercase tracking-wider w-16">Xem</th>
                              <th className="p-3 font-bold text-zinc-500 text-center uppercase tracking-wider w-16">Thêm</th>
                              <th className="p-3 font-bold text-zinc-500 text-center uppercase tracking-wider w-16">Sửa</th>
                              <th className="p-3 font-bold text-zinc-500 text-center uppercase tracking-wider w-16">Xóa</th>
                              {group.groupLabel === "Sản xuất" && <th className="p-3 font-bold text-zinc-500 text-center uppercase tracking-wider w-16">Duyệt</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {group.items.map(p => {
                              const hasApprove = p.key === "outsourcing";
                              return (
                                <tr key={p.key} className="hover:bg-indigo-50/30 transition-colors">
                                  <td className="p-3 pl-4 font-bold text-zinc-800">{p.label}</td>
                                  {["read", "create", "update", "delete"].map(action => (
                                    <td key={action} className="p-3 text-center">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded-md accent-indigo-600 cursor-pointer"
                                        checked={(watchPermissions || []).includes(\`\${p.key}:\${action}\`)}
                                        onChange={() => togglePermission(\`\${p.key}:\${action}\`)}
                                      />
                                    </td>
                                  ))}
                                  {group.groupLabel === "Sản xuất" && (
                                    <td className="p-3 text-center">
                                      {hasApprove ? (
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 rounded-md accent-emerald-600 cursor-pointer"
                                          checked={(watchPermissions || []).includes(\`\${p.key}:approve\`)}
                                          onChange={() => togglePermission(\`\${p.key}:approve\`)}
                                        />
                                      ) : null}
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>`;
                
    content = content.replace(oldRightColumn, newRightColumn);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated UserPage.jsx");
}

processUserPage();
