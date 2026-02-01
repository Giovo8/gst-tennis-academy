#!/usr/bin/env node
/**
 * Migration Script: Replace console.log with secure logger
 * 
 * This script helps migrate from console.log/error/warn to secure logger
 * Run with: node scripts/migrate-to-logger.js
 */

const fs = require('fs');
const path = require('path');

// Files to process (add more as needed)
const filesToMigrate = [
  'src/lib/email/triggers.ts',
  'src/lib/notifications/helpers.ts',
  'src/lib/notifications/createNotification.ts',
  'src/lib/notifications/notifyAdmins.ts',
  'src/lib/notifications/tournamentNotifications.ts',
  'src/lib/courts/getCourts.ts',
];

const replacements = [
  {
    from: /console\.log\(/g,
    to: 'logger.info(',
  },
  {
    from: /console\.error\(/g,
    to: 'logger.error(',
  },
  {
    from: /console\.warn\(/g,
    to: 'logger.warn(',
  },
  {
    from: /console\.debug\(/g,
    to: 'logger.debug(',
  },
];

function needsLoggerImport(content) {
  return !content.includes("from '@/lib/logger/secure-logger'") &&
         !content.includes("from \"@/lib/logger/secure-logger\"");
}

function addLoggerImport(content) {
  // Find the last import statement
  const importRegex = /^import .+ from .+;$/gm;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertIndex = lastImportIndex + lastImport.length;
    
    return content.slice(0, insertIndex) + 
           "\nimport logger from '@/lib/logger/secure-logger';" +
           content.slice(insertIndex);
  }
  
  // If no imports found, add at the beginning
  return "import logger from '@/lib/logger/secure-logger';\n\n" + content;
}

function migrateFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⏭️  Skipping ${filePath} (not found)`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;
    
    // Check if file uses console.*
    const hasConsole = /console\.(log|error|warn|debug)\(/.test(content);
    
    if (!hasConsole) {
      console.log(`✅ ${filePath} (no console statements)`);
      return;
    }
    
    // Apply replacements
    replacements.forEach(({ from, to }) => {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    });
    
    // Add logger import if needed
    if (modified && needsLoggerImport(content)) {
      content = addLoggerImport(content);
    }
    
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ ${filePath} (migrated)`);
    } else {
      console.log(`⏭️  ${filePath} (no changes)`);
    }
  } catch (error) {
    console.error(`❌ ${filePath}: ${error.message}`);
  }
}

console.log('🔄 Starting console.log migration to secure logger...\n');

filesToMigrate.forEach(migrateFile);

console.log('\n✅ Migration complete!');
console.log('\n📝 Next steps:');
console.log('1. Review the changes');
console.log('2. Test the application');
console.log('3. Search for remaining console statements: grep -r "console\\." src/');
