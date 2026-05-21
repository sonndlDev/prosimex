import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addHasPermissionToFactoryPage() {
    const filePath = path.resolve(__dirname, 'src/pages/factories/FactoryPage.jsx');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // add import
    if (!content.includes('import { useAuth }')) {
        content = content.replace('import { useForm', 'import { useAuth } from "../../context/AuthContext";\nimport { useForm');
    }
    
    // add hook
    if (!content.includes('const { hasPermission } = useAuth();')) {
        content = content.replace('const queryClient = useQueryClient();', 'const { hasPermission } = useAuth();\n  const queryClient = useQueryClient();');
    }
    
    // add button wrapper
    if (!content.includes('hasPermission("factories:create") && (')) {
        content = content.replace(
            '<Button onClick={() => handleOpen()} className="h-11',
            '{hasPermission("factories:create") && (\n          <Button onClick={() => handleOpen()} className="h-11'
        );
        content = content.replace(
            '<Plus className="w-4 h-4" /> Thêm nhà máy\n          </Button>',
            '<Plus className="w-4 h-4" /> Thêm nhà máy\n          </Button>\n          )}'
        );
    }
    
    // Update GenericTable props
    if (!content.includes('hasPermission("factories:update") ? handleOpen : undefined')) {
        content = content.replace(
            'onEdit={handleOpen}',
            'onEdit={hasPermission("factories:update") ? handleOpen : undefined}'
        );
        content = content.replace(
            'onDelete={handleDelete}',
            'onDelete={hasPermission("factories:delete") ? handleDelete : undefined}'
        );
        content = content.replace(
            'onBulkDelete={handleBulkDelete}',
            'onBulkDelete={hasPermission("factories:delete") ? handleBulkDelete : undefined}'
        );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated FactoryPage.jsx");
}

addHasPermissionToFactoryPage();
