import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, 'src', 'pages');

// Map: file path -> module permission name
const PAGE_CONFIGS = [
  {
    file: 'customers/CustomerPage.jsx',
    module: 'customers',
    importPath: '../../context/AuthContext',
    addButtonPattern: /(<Button onClick=\{[^}]*handleOpen\(\)[^}]*\}[^>]*>[\s\S]*?Thêm khách hàng[\s\S]*?<\/Button>)/,
  },
  {
    file: 'orders/OrderPage.jsx',
    module: 'orders',
    importPath: '../../context/AuthContext',
    addButtonPattern: /(<Button onClick=\{[^}]*handleOpen\(\)[^}]*\}[^>]*>[\s\S]*?Thêm đơn hàng[\s\S]*?<\/Button>)/,
  },
  {
    file: 'workers/WorkerPage.jsx',
    module: 'workers',
    importPath: '../../context/AuthContext',
    addButtonPattern: null,
  },
  {
    file: 'warehouse/WarehousePage.jsx',
    module: 'warehouse',
    importPath: '../../context/AuthContext',
    addButtonPattern: null,
  },
  {
    file: 'suppliers/SuppliersPage.jsx',
    module: 'suppliers',
    importPath: '../../context/AuthContext',
    addButtonPattern: null,
  },
  {
    file: 'products/ProductPage.jsx',
    module: 'products',
    importPath: '../../context/AuthContext',
    addButtonPattern: null,
  },
  {
    file: 'product-groups/ProductGroupPage.jsx',
    module: 'product-groups',
    importPath: '../../context/AuthContext',
    addButtonPattern: null,
  },
  {
    file: 'outsourcing/OutsourcingPage.jsx',
    module: 'outsourcing',
    importPath: '../../context/AuthContext',
    addButtonPattern: null,
  },
  {
    file: 'operations/OperationPage.jsx',
    module: 'operations',
    importPath: '../../context/AuthContext',
    addButtonPattern: null,
  },
  {
    file: 'machines/MachinePage.jsx',
    module: 'machines',
    importPath: '../../context/AuthContext',
    addButtonPattern: null,
  },
  {
    file: 'daily-tickets/DailyTicketPage.jsx',
    module: 'daily-tickets',
    importPath: '../../context/AuthContext',
    addButtonPattern: null,
  },
  {
    file: 'attendance/AttendanceManagementPage.jsx',
    module: 'attendance',
    importPath: '../../context/AuthContext',
    addButtonPattern: null,
  },
];

function processFile(config) {
  const filePath = path.join(PAGES_DIR, config.file);

  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] File not found: ${config.file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Add useAuth import if not present
  if (!content.includes('useAuth')) {
    // Find the last import statement and add after it
    const importPattern = /^(import .+ from ['"].+['"];?\r?\n)/m;
    // Find all imports and add after the last one
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIdx = i;
      }
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, `import { useAuth } from "${config.importPath}";`);
      content = lines.join('\n');
      modified = true;
      console.log(`  [+] Added useAuth import`);
    }
  } else {
    console.log(`  [~] useAuth import already present`);
  }

  // 2. Add hasPermission inside the component function (after first useState or first const in component)
  if (!content.includes('hasPermission')) {
    // Find the component's opening - look for "export default function" or specific patterns
    // Then find a good insertion point (after queryClient or first useState)
    const insertAfterPatterns = [
      /(\bconst queryClient = useQueryClient\(\);)/,
      /(\bconst \[[\w]+, set[\w]+\] = useState\()/,
    ];

    let inserted = false;
    for (const pattern of insertAfterPatterns) {
      const match = content.match(pattern);
      if (match) {
        const insertionPoint = match.index + match[0].length;
        // Find end of line
        const endOfLine = content.indexOf('\n', insertionPoint);
        const insertion = `\n  const { hasPermission } = useAuth();`;
        content = content.slice(0, endOfLine) + insertion + content.slice(endOfLine);
        modified = true;
        console.log(`  [+] Added hasPermission hook`);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      console.log(`  [!] Could not find insertion point for hasPermission`);
    }
  } else {
    console.log(`  [~] hasPermission already present`);
  }

  // 3. Wrap onEdit prop with hasPermission check
  const mod = config.module;
  
  // Pattern: onEdit={handleOpen} or onEdit={someHandler}
  // Replace with: onEdit={hasPermission("mod:update") ? handleOpen : undefined}
  const onEditPattern = /onEdit=\{((?!hasPermission)[^}]+)\}/g;
  if (onEditPattern.test(content) && !content.includes(`hasPermission("${mod}:update")`)) {
    content = content.replace(/onEdit=\{((?!hasPermission)[^}]+)\}/g, (match, handler) => {
      return `onEdit={hasPermission("${mod}:update") ? ${handler.trim()} : undefined}`;
    });
    modified = true;
    console.log(`  [+] Wrapped onEdit with permission`);
  } else {
    console.log(`  [~] onEdit already handled or not found`);
  }

  // 4. Wrap onDelete prop with hasPermission check
  const onDeletePattern = /onDelete=\{((?!hasPermission)[^}]+)\}/g;
  if (onDeletePattern.test(content) && !content.includes(`hasPermission("${mod}:delete")`)) {
    content = content.replace(/onDelete=\{((?!hasPermission)[^}]+)\}/g, (match, handler) => {
      return `onDelete={hasPermission("${mod}:delete") ? ${handler.trim()} : undefined}`;
    });
    modified = true;
    console.log(`  [+] Wrapped onDelete with permission`);
  } else {
    console.log(`  [~] onDelete already handled or not found`);
  }

  // 5. Wrap onBulkDelete prop with hasPermission check
  const onBulkDeletePattern = /onBulkDelete=\{((?!hasPermission)[^}]+)\}/g;
  if (onBulkDeletePattern.test(content) && !content.includes(`hasPermission("${mod}:delete")`)) {
    content = content.replace(/onBulkDelete=\{((?!hasPermission)[^}]+)\}/g, (match, handler) => {
      return `onBulkDelete={hasPermission("${mod}:delete") ? ${handler.trim()} : undefined}`;
    });
    modified = true;
    console.log(`  [+] Wrapped onBulkDelete with permission`);
  } else {
    console.log(`  [~] onBulkDelete already handled or not found`);
  }

  // 6. Wrap "Thêm..." buttons at the top header section with hasPermission check
  // Look for the pattern: <Button onClick={() => handleOpen()} ...>...Thêm...
  // Wrap the entire button in {hasPermission("mod:create") && (...)}
  const addBtnRegex = /(\s*)(<Button\s[^>]*onClick=\{[^}]*handleOpen\(\)[^}]*\}[^>]*>[\s\S]*?(?:Thêm|Tạo|Thêm mới)[^<]*<\/Button>)/g;
  
  let addBtnMatch;
  let tempContent = content;
  let offset = 0;
  let addBtnFound = false;
  
  // Reset regex
  addBtnRegex.lastIndex = 0;
  
  while ((addBtnMatch = addBtnRegex.exec(content)) !== null) {
    // Check if this button is not already wrapped with hasPermission
    const beforeBtn = content.slice(Math.max(0, addBtnMatch.index - 50), addBtnMatch.index);
    if (!beforeBtn.includes('hasPermission') && !content.slice(addBtnMatch.index, addBtnMatch.index + 200).includes(`hasPermission("${mod}:create")`)) {
      addBtnFound = true;
      break;
    }
  }
  
  if (addBtnFound) {
    // Wrap the add button - simpler approach: find and replace specific pattern
    // This is complex so just note it needs manual check
    console.log(`  [!] Add button found but needs manual wrapping with hasPermission("${mod}:create")`);
    
    // Try a simple wrap: find the button in the header section
    // Look for pattern inside flex div near the top with "Thêm"
    const headerBtnRegex = /([ \t]*)(<Button\s(?:[^>]|\n)*?onClick=\{(?:[^}]|\n)*?handleOpen\(\)(?:[^}]|\n)*?\}(?:[^>]|\n)*?>(?:[^<]|\n)*?(?:Thêm|Tạo mới)[^<]*(?:<[^/][^>]*>[^<]*<\/[^>]*>)*(?:[^<]|\n)*?<\/Button>)/;
    const headerBtnMatch = content.match(headerBtnRegex);
    if (headerBtnMatch && !content.includes(`hasPermission("${mod}:create")`)) {
      const indent = headerBtnMatch[1];
      const btnCode = headerBtnMatch[2];
      content = content.replace(headerBtnMatch[0], 
        `${indent}{hasPermission("${mod}:create") && (\n${indent}  ${btnCode}\n${indent})}`
      );
      modified = true;
      console.log(`  [+] Wrapped Add button with hasPermission("${mod}:create")`);
    }
  } else {
    console.log(`  [~] Add button already wrapped or not found`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  [OK] Saved: ${config.file}`);
  } else {
    console.log(`  [--] No changes needed for: ${config.file}`);
  }
}

console.log('=== Adding hasPermission to all pages ===\n');

for (const config of PAGE_CONFIGS) {
  console.log(`\nProcessing: ${config.file}`);
  try {
    processFile(config);
  } catch (err) {
    console.error(`  [ERROR] ${err.message}`);
  }
}

console.log('\n=== Done ===');
