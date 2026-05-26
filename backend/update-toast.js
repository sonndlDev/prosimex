const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../frontend/src/pages');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (f.endsWith('.jsx')) {
      callback(dirPath);
    }
  });
}

walkDir(pagesDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Add import { toast } from "sonner" if missing and we have useMutation
  if (content.includes('useMutation') && !content.includes('toast.error')) {
    if (!content.includes('import { toast }')) {
      content = content.replace(/(import .* from ['"]react['"];?\n?)/, '$1import { toast } from "sonner";\n');
      if (!content.includes('import { toast }')) {
         content = 'import { toast } from "sonner";\n' + content;
      }
      changed = true;
    }

    // Fix WorkerPage.jsx specific mutations
    if (content.includes('workerService.create')) {
       content = content.replace(
         /useMutation\(\{ mutationFn: workerService\.create, onSuccess: \(\) => \{ queryClient\.invalidateQueries\(\["workers"\]\); setOpenModal\(false\); \} \}\)/,
         'useMutation({ mutationFn: workerService.create, onSuccess: () => { queryClient.invalidateQueries(["workers"]); setOpenModal(false); toast.success("Thành công"); }, onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi tạo") })'
       );
       content = content.replace(
         /useMutation\(\{ mutationFn: \(data\) => workerService\.update\(data\.id, data\.payload\), onSuccess: \(\) => \{ queryClient\.invalidateQueries\(\["workers"\]\); setOpenModal\(false\); \} \}\)/,
         'useMutation({ mutationFn: (data) => workerService.update(data.id, data.payload), onSuccess: () => { queryClient.invalidateQueries(["workers"]); setOpenModal(false); toast.success("Thành công"); }, onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi cập nhật") })'
       );
       content = content.replace(
         /useMutation\(\{ mutationFn: workerService\.delete, onSuccess: \(\) => queryClient\.invalidateQueries\(\["workers"\]\) \}\)/,
         'useMutation({ mutationFn: workerService.delete, onSuccess: () => { queryClient.invalidateQueries(["workers"]); toast.success("Thành công"); }, onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi xóa") })'
       );
    }

    // Fix mutationOpts generally
    if (content.includes('const mutationOpts = { onSuccess: () => { queryClient.invalidateQueries')) {
       content = content.replace(
         /const mutationOpts = \{ onSuccess: \(\) => \{ queryClient\.invalidateQueries\([^)]+\); handleClose\(\); \} \};/g,
         (match) => {
             let inner = match.replace('const mutationOpts = { ', '').replace(' };', '');
             // add toast to onSuccess
             inner = inner.replace('handleClose();', 'handleClose(); toast.success("Thành công");');
             return `const mutationOpts = { ${inner}, onError: (err) => toast.error(err.response?.data?.message || "Có lỗi xảy ra") };`;
         }
       );
    }

    // Fix deleteMutations using onSuccess only
    content = content.replace(
       /useMutation\(\{ mutationFn: ([A-Za-z0-9.]+delete), onSuccess: \(\) => queryClient\.invalidateQueries\(([^)]+)\) \}\)/g,
       'useMutation({ mutationFn: $1, onSuccess: () => { queryClient.invalidateQueries($2); toast.success("Thành công"); }, onError: (err) => toast.error(err.response?.data?.message || "Lỗi khi xóa") })'
    );
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Updated', filePath);
  }
});
