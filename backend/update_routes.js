import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modulesDir = path.resolve(__dirname, 'src/modules');

const getAction = (method) => {
    switch (method.toLowerCase()) {
        case 'get': return 'read';
        case 'post': return 'create';
        case 'put':
        case 'patch': return 'update';
        case 'delete': return 'delete';
        default: return 'read';
    }
};

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern: router.get('/something', authorize(['ROLES'], 'module'), handler)
    // We want to replace 'module' with 'module:read' etc. based on router.method
    // Some routes might have formatting with newlines.
    
    // We will do a simple regex:
    // /router\.(get|post|put|patch|delete)\(([\s\S]*?)authorize\(([^,]+),\s*['"]([^'":]+)['"]\)/g
    // But this might be too greedy. Let's do it line by line if possible, or use a safer regex.
    
    const regex = /router\.(get|post|put|patch|delete)\(([\s\S]*?)authorize\((.*?),\s*['"]([^'":]+)['"]\)/g;
    
    let modified = false;
    const newContent = content.replace(regex, (match, method, beforeAuth, roles, module) => {
        modified = true;
        const action = getAction(method);
        // Exception for outsourcing approval? If the path has /approve or something, we could make it :approve
        let finalAction = action;
        if (beforeAuth.includes('approve') || beforeAuth.includes('status')) {
            if (module === 'outsourcing') {
                 finalAction = 'approve';
            }
        }
        
        return `router.${method}(${beforeAuth}authorize(${roles}, '${module}:${finalAction}')`;
    });
    
    if (modified) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDir(fullPath);
        } else if (file.endsWith('.routes.js')) {
            processFile(fullPath);
        }
    }
}

traverseDir(modulesDir);
console.log("Route update complete.");
