#!/usr/bin/env node

/**
 * normalize-eof.js - Generic EOF Normalization Script
 * 
 * Normalizes line endings (CRLF → LF) and ensures a single newline at end of files.
 * Works with any project structure and can be customized via command-line arguments.
 * 
 * Usage:
 *   node normalize-eof-generic.js                    # Scan current directory
 *   node normalize-eof-generic.js --dir src          # Scan specific directory
 *   node normalize-eof-generic.js --dir src --ext .ts,.tsx,.js
 *   node normalize-eof-generic.js --help             # Show help
 * 
 * Options:
 *   --dir <path>        Directory to scan (default: current directory)
 *   --ext <extensions>  Comma-separated file extensions (default: common extensions)
 *   --skip <dirs>       Comma-separated directories to skip (default: common build dirs)
 *   --dry-run           Show what would be changed without modifying files
 *   --quiet             Only show errors and summary
 *   --help              Show this help message
 * 
 * Examples:
 *   # Normalize all files in current directory
 *   node normalize-eof-generic.js
 * 
 *   # Normalize only TypeScript files in src/
 *   node normalize-eof-generic.js --dir src --ext .ts,.tsx
 * 
 *   # Preview changes without modifying files
 *   node normalize-eof-generic.js --dry-run
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.jsx', '.md', '.mdc', '.sh', '.json', '.yaml', '.yml', '.txt', '.css', '.scss', '.html', '.xml'];
const DEFAULT_SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'migrations', '.cache', '.turbo', '.vscode', '.idea'];
const SPECIAL_FILENAMES = ['.gitkeep', '.gitignore', '.env.example'];

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = {
    dirs: [],
    extensions: [...DEFAULT_EXTENSIONS],
    skipDirs: [...DEFAULT_SKIP_DIRS],
    dryRun: false,
    quiet: false,
    help: false
  };

  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--dir' || arg === '-d') {
      const dir = process.argv[++i];
      if (dir) args.dirs.push(dir);
    } else if (arg === '--ext' || arg === '-e') {
      const ext = process.argv[++i];
      if (ext) {
        args.extensions = ext.split(',').map(e => e.startsWith('.') ? e : `.${e}`);
      }
    } else if (arg === '--skip' || arg === '-s') {
      const skip = process.argv[++i];
      if (skip) {
        args.skipDirs = skip.split(',');
      }
    } else if (arg === '--dry-run' || arg === '--dry') {
      args.dryRun = true;
    } else if (arg === '--quiet' || arg === '-q') {
      args.quiet = true;
    }
  }

  // Default to current directory if no dirs specified
  if (args.dirs.length === 0) {
    args.dirs.push(process.cwd());
  }

  return args;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
normalize-eof.js - Generic EOF Normalization Script

Normalizes line endings (CRLF → LF) and ensures a single newline at end of files.

Usage:
  node normalize-eof-generic.js [options]

Options:
  --dir, -d <path>        Directory to scan (can be used multiple times)
                         Default: current directory
  --ext, -e <extensions>  Comma-separated file extensions
                         Default: .ts,.tsx,.js,.mjs,.jsx,.md,.mdc,.sh,.json,.yaml,.yml,.txt,.css,.scss,.html,.xml
  --skip, -s <dirs>      Comma-separated directories to skip
                         Default: node_modules,.git,dist,build,.next,coverage,migrations,.cache,.turbo
  --dry-run, --dry       Show what would be changed without modifying files
  --quiet, -q            Only show errors and summary
  --help, -h             Show this help message

Examples:
  # Normalize all files in current directory
  node normalize-eof-generic.js

  # Normalize only TypeScript files in src/
  node normalize-eof-generic.js --dir src --ext .ts,.tsx

  # Scan multiple directories
  node normalize-eof-generic.js --dir src --dir tests

  # Preview changes without modifying files
  node normalize-eof-generic.js --dry-run

  # Quiet mode (only show summary)
  node normalize-eof-generic.js --quiet
`);
}

/**
 * Check if a file should be processed based on its extension or special filename
 */
function shouldProcessFile(filename, ext, extensions, specialFilenames) {
  return specialFilenames.includes(filename) || extensions.includes(ext);
}

/**
 * Normalize file content: convert CRLF to LF and ensure single newline at EOF
 */
function normalizeContent(content) {
  return content.replace(/\r\n/g, '\n').replace(/[\s\n]*$/, '\n');
}

/**
 * Process a single file: read, normalize, and write if changed
 */
function processFile(filepath, dryRun) {
  try {
    const originalContent = fs.readFileSync(filepath, 'utf8');
    const normalizedContent = normalizeContent(originalContent);
    
    if (originalContent === normalizedContent) {
      return { filepath, changed: false, error: null };
    }
    
    if (!dryRun) {
      fs.writeFileSync(filepath, normalizedContent, 'utf8');
    }
    
    return { 
      filepath, 
      changed: true, 
      error: null,
      originalLength: originalContent.length,
      normalizedLength: normalizedContent.length,
      dryRun
    };
  } catch (error) {
    return { filepath, changed: false, error: error.message };
  }
}

/**
 * Recursively scan directory and collect all files to process
 */
function collectFiles(dir, extensions, skipDirs, specialFilenames) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    console.warn(`Directory does not exist: ${dir}`);
    return files;
  }
  
  const entries = fs.readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!skipDirs.includes(entry)) {
        files.push(...collectFiles(fullPath, extensions, skipDirs, specialFilenames));
      }
    } else {
      const ext = path.extname(fullPath);
      if (shouldProcessFile(entry, ext, extensions, specialFilenames)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Format file path for display (relative to current directory)
 */
function formatPath(filepath) {
  const cwd = process.cwd();
  if (filepath.startsWith(cwd)) {
    return path.relative(cwd, filepath);
  }
  return filepath;
}

/**
 * Main execution: scan directories, process files, report results
 */
function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  if (!args.quiet) {
    console.log('Starting EOF normalization...\n');
    if (args.dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified\n');
    }
  }

  // Step 1: Collect all files to process
  if (!args.quiet) {
    console.log('Scanning directories...');
  }
  const allFiles = [];
  args.dirs.forEach(dir => {
    const absDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    const files = collectFiles(absDir, args.extensions, args.skipDirs, SPECIAL_FILENAMES);
    if (!args.quiet) {
      console.log(`  ${dir}: found ${files.length} files`);
    }
    allFiles.push(...files);
  });

  if (!args.quiet) {
    console.log(`\nTotal files to scan: ${allFiles.length}\n`);
  }

  // Step 2: Process each file
  if (!args.quiet && allFiles.length > 0) {
    console.log('Processing files...');
  }
  const results = allFiles.map(file => processFile(file, args.dryRun));

  // Step 3: Analyze and report results
  const changed = results.filter(r => r.changed);
  const errors = results.filter(r => r.error);

  if (!args.quiet) {
    console.log('\n--- Results ---');
  }

  if (changed.length > 0) {
    const action = args.dryRun ? 'Would fix' : 'Fixed';
    if (!args.quiet) {
      console.log(`\n${action} ${changed.length} file(s):`);
      changed.forEach(r => {
        const marker = args.dryRun ? '🔍' : '✓';
        console.log(`  ${marker} ${formatPath(r.filepath)} (${r.originalLength} → ${r.normalizedLength} bytes)`);
      });
    } else {
      // Quiet mode: just list files
      changed.forEach(r => {
        console.log(formatPath(r.filepath));
      });
    }
  }

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(r => {
      console.log(`  ✗ ${formatPath(r.filepath)}: ${r.error}`);
    });
  }

  if (changed.length === 0 && errors.length === 0) {
    if (!args.quiet) {
      console.log('No changes needed - all files already normalized.');
    }
  }

  // Summary
  const summary = args.dryRun 
    ? `Would fix ${changed.length} of ${allFiles.length} files.`
    : `Done. Fixed ${changed.length} of ${allFiles.length} files.`;
  
  if (!args.quiet || changed.length > 0 || errors.length > 0) {
    console.log(`\n${summary}`);
  }

  // Exit code: 0 if success, 1 if errors
  process.exit(errors.length > 0 ? 1 : 0);
}

// Run the script
main();
