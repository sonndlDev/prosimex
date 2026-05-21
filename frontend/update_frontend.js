import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function processAppRouter() {
    const filePath = path.resolve(__dirname, 'src/AppRouter.jsx');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace requiredPermission="xxx" with requiredPermission="xxx:read"
    // Don't replace if it already has :read
    const regex = /requiredPermission="([^":]+)"/g;
    content = content.replace(regex, 'requiredPermission="$1:read"');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated AppRouter.jsx");
}

function processMainLayout() {
    const filePath = path.resolve(__dirname, 'src/layouts/MainLayout.jsx');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update user.permissions.includes(item.permission) -> user.permissions.includes(`${item.permission}:read`)
    // Update user.permissions.includes(i.permission) -> user.permissions.includes(`${i.permission}:read`)
    
    content = content.replace(/user\.permissions\.includes\(i\.permission\)/g, 'user.permissions.includes(`${i.permission}:read`)');
    content = content.replace(/user\.permissions\.includes\(item\.permission\)/g, 'user.permissions.includes(`${item.permission}:read`)');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log("Updated MainLayout.jsx");
}

processAppRouter();
processMainLayout();
