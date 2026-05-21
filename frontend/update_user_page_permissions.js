import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addHasPermissionToUserPage() {
    const filePath = path.resolve(__dirname, 'src/pages/auth/UserPage.jsx');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // add import if not exists
    if (!content.includes('import { useAuth }')) {
        content = content.replace('import GenericTable', 'import { useAuth } from "../../context/AuthContext";\nimport GenericTable');
    }
    
    // add const { hasPermission } = useAuth();
    if (!content.includes('const { hasPermission } = useAuth();')) {
        content = content.replace('const queryClient = useQueryClient();', 'const { hasPermission } = useAuth();\n  const queryClient = useQueryClient();');
    }
    
    // wrap Add button
    if (!content.includes('hasPermission("users:create") && (')) {
        content = content.replace(
            '<Button onClick={() => handleOpen()}', 
            '{hasPermission("users:create") && (\n          <Button onClick={() => handleOpen()}'
        );
        // Need to add )} after the button. The button ends at </Button>
        // It's easier to use a regex or just specific replace.
        content = content.replace(
            '<UserPlus className="w-4 h-4" /> Thêm người dùng\n          </Button>',
            '<UserPlus className="w-4 h-4" /> Thêm người dùng\n          </Button>\n          )}'
        );
    }
    
    // Wrap generic table actions
    if (!content.includes('onEdit={hasPermission("users:update") ? handleOpen : undefined}')) {
        content = content.replace(
            'onEdit={handleOpen}',
            'onEdit={hasPermission("users:update") ? handleOpen : undefined}'
        );
    }
    
    if (!content.includes('onDelete={hasPermission("users:delete") ? (u) => {')) {
        content = content.replace(
            'onDelete={(u) => { if (window.confirm',
            'onDelete={hasPermission("users:delete") ? (u) => { if (window.confirm'
        );
        content = content.replace(
            'onBulkDelete={(ids) => { if (window.confirm',
            'onBulkDelete={hasPermission("users:delete") ? (ids) => { if (window.confirm'
        );
        content = content.replace(
            'deleteMutation.mutate(u.id); }}',
            'deleteMutation.mutate(u.id); } } : undefined}'
        );
        content = content.replace(
            'ids.forEach(id => deleteMutation.mutate(id)); }}',
            'ids.forEach(id => deleteMutation.mutate(id)); } } : undefined}'
        );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated UserPage.jsx");
}

addHasPermissionToUserPage();
