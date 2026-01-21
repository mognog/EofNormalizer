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
 *   --blank-lines <n>   Number of blank lines to add at EOF (0-10, default: 1)
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

// Try to use the 'ignore' package if available (optional dependency)
let Ignore;
try {
  Ignore = require('ignore');
} catch (_e) {
  Ignore = null;
}

// Default configuration
const DEFAULT_EXTENSIONS = [
  // JavaScript/TypeScript/Web
  '.ts', '.tsx', '.js', '.mjs', '.jsx', '.vue', '.svelte',
  // C/C++
  '.c', '.cpp', '.cxx', '.cc', '.h', '.hpp', '.hxx', '.h++',
  // C#
  '.cs', '.csx',
  // Go
  '.go',
  // Rust
  '.rs',
  // Python
  '.py', '.pyw', '.pyi',
  // Java/Kotlin
  '.java', '.kt', '.kts',
  // Other languages
  '.pas', '.pp', '.p',  // Pascal
  '.rb',                // Ruby
  '.php',               // PHP
  '.swift',             // Swift
  '.scala',             // Scala
  '.dart',              // Dart
  '.lua',               // Lua
  '.r', '.R',           // R
  '.sql',               // SQL
  '.pl', '.pm',         // Perl
  // Markup/Config
  '.md', '.mdc', '.html', '.xml', '.svg',
  // Stylesheets
  '.css', '.scss', '.sass', '.less', '.styl',
  // Config/Data
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
  // Scripts/Shell
  '.sh', '.bash', '.zsh', '.fish', '.ps1',
  // Misc
  '.txt', '.log', '.gitignore', '.dockerfile', '.makefile', '.cmake'
];
const DEFAULT_SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'migrations', '.cache', '.turbo', '.vscode', '.idea'];
const SPECIAL_FILENAMES = ['.gitkeep', '.gitignore', '.env.example'];

// Binary file extensions that should always be excluded from processing
const BINARY_EXTENSIONS = [
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif', '.heic', '.heif',
  '.tiff', '.tif', '.psd', '.ai', '.eps', '.raw', '.cr2', '.nef', '.orf', '.sr2',
  // Fonts
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  // Archives
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar', '.cab', '.deb', '.rpm',
  // Media
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4a', '.wav', '.flac', '.ogg',
  // Documents (binary formats)
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
  // Executables
  '.exe', '.dll', '.so', '.dylib', '.bin', '.app', '.deb', '.rpm', '.msi',
  // Database
  '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb',
  // Other binary
  '.class', '.jar', '.war', '.ear', '.pyc', '.pyo', '.o', '.obj', '.lib', '.a'
];

/**
 * Simple gitignore pattern parser (basic implementation)
 * Handles common patterns: *, **, /, negation, comments
 */
class GitIgnoreParser {
  constructor(rules = []) {
    this.rules = this.parseRules(rules);
  }

  parseRules(rules) {
    const parsed = [];
    for (const rule of rules) {
      const trimmed = rule.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue; // Skip empty lines and comments
      }

      const isNegation = trimmed.startsWith('!');
      const pattern = isNegation ? trimmed.slice(1) : trimmed;
      const isDirectory = pattern.endsWith('/');
      const cleanPattern = pattern.replace(/\/$/, '');

      parsed.push({
        pattern: cleanPattern,
        isNegation,
        isDirectory,
        regex: this.patternToRegex(cleanPattern, isDirectory)
      });
    }
    return parsed;
  }

  patternToRegex(pattern, isDirectory) {
    // Convert gitignore pattern to regex
    // Escape special chars except * and ?
    let regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\?\?/g, '.')
      .replace(/\*\*/g, '___DOUBLESTAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/___DOUBLESTAR___/g, '.*');

    // Handle leading slash (anchor to root) vs no slash (match anywhere)
    if (pattern.startsWith('/')) {
      regexStr = '^' + regexStr.slice(1);
    } else {
      regexStr = '(^|/)' + regexStr;
    }

    // Handle trailing slash (directory pattern)
    if (isDirectory) {
      // For directory patterns like "build/", match:
      // - "build/" (exact match)
      // - "build/anything" (files/dirs inside)
      // Use lookahead or allow any characters after the slash
      regexStr = regexStr + '(?:/.*|$)';
    } else {
      // For file patterns, match exact file or directory
      regexStr = regexStr + '(?:/|$)';
    }

    return new RegExp(regexStr);
  }

  shouldIgnore(filePath, _isDirectory = false) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    let ignored = false;

    // Process rules in order (important for negation)
    for (const rule of this.rules) {
      let matches = rule.regex.test(normalizedPath);
      
      // For directory patterns, ensure we're matching files/dirs inside that directory
      if (matches && rule.isDirectory) {
        const patternDir = rule.pattern;
        // Directory pattern "build/" should match "build/anything" but not "build" as a file
        // Check if path is inside the directory or is the directory itself
        if (!normalizedPath.startsWith(patternDir + '/') && normalizedPath !== patternDir) {
          // Also check if path equals the pattern exactly (for exact directory match)
          matches = false;
        }
      }
      
      if (matches) {
        if (rule.isNegation) {
          // Negation only works if file was already ignored
          // In gitignore, negation un-ignores a previously ignored file
          if (ignored) {
            ignored = false;
          }
        } else {
          // Regular ignore pattern
          ignored = true;
        }
      }
    }

    return ignored;
  }

  static fromFile(gitignorePath) {
    if (!fs.existsSync(gitignorePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      const lines = content.split(/\r?\n/);
      return new GitIgnoreParser(lines);
    } catch (_error) {
      return null;
    }
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs() {
  const args = {
    dirs: [],
    extensions: [...DEFAULT_EXTENSIONS],
    skipDirs: [...DEFAULT_SKIP_DIRS],
    gitignorePath: null,
    useGitignore: true,
    dryRun: false,
    quiet: false,
    help: false,
    includeNoExt: false,
    blankLines: 1
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
    } else if (arg === '--gitignore' || arg === '-g') {
      const gitignorePath = process.argv[++i];
      if (gitignorePath) {
        args.gitignorePath = gitignorePath;
      }
    } else if (arg === '--no-gitignore') {
      args.useGitignore = false;
    } else if (arg === '--dry-run' || arg === '--dry') {
      args.dryRun = true;
    } else if (arg === '--quiet' || arg === '-q') {
      args.quiet = true;
    } else if (arg === '--include-no-ext') {
      args.includeNoExt = true;
    } else if (arg === '--blank-lines' || arg === '-b') {
      const blankLines = parseInt(process.argv[++i], 10);
      if (!isNaN(blankLines) && blankLines >= 0 && blankLines <= 10) {
        args.blankLines = blankLines;
      }
    }
  }

  // Default to current directory if no dirs specified
  if (args.dirs.length === 0) {
    args.dirs.push(process.cwd());
  }

  // Auto-detect .gitignore if not specified and gitignore is enabled
  if (args.useGitignore && !args.gitignorePath) {
    const cwd = process.cwd();
    const defaultGitignore = path.join(cwd, '.gitignore');
    if (fs.existsSync(defaultGitignore)) {
      args.gitignorePath = defaultGitignore;
    }
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
                         Default: many common extensions (see README)
  --skip, -s <dirs>      Comma-separated directories to skip
                         Default: node_modules,.git,dist,build,.next,coverage,migrations,.cache,.turbo
  --gitignore, -g <file> Path to .gitignore file (default: ./.gitignore if exists)
                         Skips files and directories matching gitignore patterns
  --no-gitignore         Disable gitignore filtering
  --include-no-ext       Include files with no file extension (e.g., LICENSE, README)
  --blank-lines, -b <n>  Number of blank lines to add at end of file (0-10)
                         Default: 1
  --dry-run, --dry       Show what would be changed without modifying files
  --quiet, -q            Only show errors and summary
  --help, -h             Show this help message

Examples:
  # Normalize all files in current directory (respects .gitignore)
  node normalize-eof-generic.js

  # Normalize only TypeScript files in src/
  node normalize-eof-generic.js --dir src --ext .ts,.tsx

  # Use custom gitignore file
  node normalize-eof-generic.js --gitignore .myignore

  # Disable gitignore filtering
  node normalize-eof-generic.js --no-gitignore

  # Preview changes without modifying files
  node normalize-eof-generic.js --dry-run

  # Quiet mode (only show summary)
  node normalize-eof-generic.js --quiet
`);
}

/**
 * Check if a file should be processed based on its extension or special filename
 */
function shouldProcessFile(filename, ext, extensions, specialFilenames, includeNoExt = false) {
  // Never process binary file extensions
  if (BINARY_EXTENSIONS.includes(ext.toLowerCase())) {
    return false;
  }
  // Always process special filenames
  if (specialFilenames.includes(filename)) {
    return true;
  }
  // Process files with matching extension
  if (extensions.includes(ext)) {
    return true;
  }
  // Process files with no extension if option is enabled
  if (includeNoExt && ext === '') {
    return true;
  }
  return false;
}

/**
 * Normalize file content: convert CRLF to LF and ensure specified number of newlines at EOF
 * @param {string} content - The file content to normalize
 * @param {number} blankLines - Number of blank lines to add at EOF (0-10, default: 1)
 */
function normalizeContent(content, blankLines = 1) {
  // Clamp blankLines to valid range
  const lines = Math.max(0, Math.min(10, blankLines));
  // Convert CRLF to LF, then remove all trailing whitespace/newlines and add specified number of newlines
  const eofNewlines = '\n'.repeat(lines);
  return content.replace(/\r\n/g, '\n').replace(/[\s\n]*$/, eofNewlines);
}

/**
 * Count lines in content (number of newline characters)
 */
function countLines(content) {
  if (content.length === 0) return 0;
  // Count newlines (both \n and \r\n are normalized to \n)
  const matches = content.match(/\n/g);
  return matches ? matches.length : 0;
}

/**
 * Check if a file appears to be binary by examining its content
 * Returns true if the file contains null bytes or too many non-text characters
 */
function isBinaryFile(filepath) {
  try {
    // Read first 8KB to check for binary content
    const buffer = fs.readFileSync(filepath);
    const sampleSize = Math.min(buffer.length, 8192);
    const sample = buffer.slice(0, sampleSize);
    
    // Check for null bytes (strong indicator of binary)
    if (sample.includes(0)) {
      return true;
    }
    
    // Check for high percentage of non-printable characters (excluding common whitespace)
    let nonTextCount = 0;
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      // Allow: printable ASCII (32-126), tab (9), LF (10), CR (13)
      if (byte < 9 || (byte > 13 && byte < 32) || byte > 126) {
        nonTextCount++;
      }
    }
    // If more than 30% non-text characters, likely binary
    return nonTextCount / sample.length > 0.3;
  } catch (_error) {
    // If we can't read it, assume it's not binary (safer to skip)
    return false;
  }
}

/**
 * Process a single file: read, normalize, and write if changed
 */
function processFile(filepath, dryRun, blankLines = 1) {
  try {
    // Safety check: skip binary files even if they passed extension filtering
    if (isBinaryFile(filepath)) {
      return { filepath, changed: false, error: 'Binary file detected (skipped)' };
    }

    const originalContent = fs.readFileSync(filepath, 'utf8');
    const normalizedContent = normalizeContent(originalContent, blankLines);

    if (originalContent === normalizedContent) {
      return { filepath, changed: false, error: null };
    }

    if (!dryRun) {
      fs.writeFileSync(filepath, normalizedContent, 'utf8');
    }

    const originalLineCount = countLines(originalContent);
    const normalizedLineCount = countLines(normalizedContent);

    return {
      filepath,
      changed: true,
      error: null,
      originalLength: originalContent.length,
      normalizedLength: normalizedContent.length,
      originalLineCount,
      normalizedLineCount,
      dryRun
    };
  } catch (error) {
    return { filepath, changed: false, error: error.message };
  }
}

/**
 * Load gitignore rules from file(s)
 * Supports both the 'ignore' package (if available) and built-in parser
 */
function loadGitIgnore(gitignorePath) {
  if (!gitignorePath || !fs.existsSync(gitignorePath)) {
    return null;
  }

  // Root directory is where the gitignore file is located
  const rootDir = path.dirname(path.resolve(gitignorePath));

  // Use 'ignore' package if available (more accurate)
  if (Ignore) {
    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      const ig = Ignore().add(content);
      return {
        type: 'ignore-package',
        matcher: ig,
        rootDir: rootDir
      };
    } catch (_error) {
      // Fall through to built-in parser
    }
  }

  // Use built-in parser
  const parser = GitIgnoreParser.fromFile(gitignorePath);
  if (parser) {
    return {
      type: 'built-in',
      matcher: parser,
      rootDir: rootDir
    };
  }

  return null;
}

/**
 * Check if a path should be ignored based on gitignore rules
 */
function isIgnored(filePath, gitignore) {
  if (!gitignore) {
    return false;
  }

  // Path relative to gitignore file's directory
  const relativePath = path.relative(gitignore.rootDir, filePath).replace(/\\/g, '/');
  
  // Handle paths that are outside the gitignore root (shouldn't happen, but be safe)
  if (relativePath.startsWith('..')) {
    return false;
  }

  try {
    if (gitignore.type === 'ignore-package') {
      return gitignore.matcher.ignores(relativePath);
    } else if (gitignore.type === 'built-in') {
      const stat = fs.statSync(filePath);
      return gitignore.matcher.shouldIgnore(relativePath, stat.isDirectory());
    }
  } catch (_error) {
    // If we can't determine, don't ignore it (safer default)
    return false;
  }

  return false;
}

/**
 * Recursively scan directory and collect all files to process
 */
function collectFiles(dir, extensions, skipDirs, specialFilenames, gitignore = null, includeNoExt = false) {
  const files = [];
  
  if (!fs.existsSync(dir)) {
    console.warn(`Directory does not exist: ${dir}`);
    return files;
  }
  
  const entries = fs.readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    
    // Check gitignore first (before stat to avoid unnecessary I/O)
    if (gitignore && isIgnored(fullPath, gitignore)) {
      continue;
    }
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!skipDirs.includes(entry)) {
        files.push(...collectFiles(fullPath, extensions, skipDirs, specialFilenames, gitignore, includeNoExt));
      }
    } else {
      const ext = path.extname(fullPath);
      if (shouldProcessFile(entry, ext, extensions, specialFilenames, includeNoExt)) {
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

  // Step 0: Load gitignore if enabled
  let gitignore = null;
  if (args.useGitignore && args.gitignorePath) {
    const absGitignorePath = path.isAbsolute(args.gitignorePath) 
      ? args.gitignorePath 
      : path.join(process.cwd(), args.gitignorePath);
    gitignore = loadGitIgnore(absGitignorePath);
    if (gitignore && !args.quiet) {
      const method = gitignore.type === 'ignore-package' ? 'ignore package' : 'built-in parser';
      console.log(`Using .gitignore rules (${method}): ${args.gitignorePath}\n`);
    }
  }

  // Step 1: Collect all files to process
  if (!args.quiet) {
    console.log('Scanning directories...');
  }
  const allFiles = [];
  args.dirs.forEach(dir => {
    const absDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
    const files = collectFiles(absDir, args.extensions, args.skipDirs, SPECIAL_FILENAMES, gitignore, args.includeNoExt);
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
  const results = allFiles.map(file => processFile(file, args.dryRun, args.blankLines));

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
        const lineDiff = r.normalizedLineCount - r.originalLineCount;
        let lineInfo = '';
        if (lineDiff !== 0) {
          const lineChange = lineDiff > 0 
            ? `+${lineDiff} line${lineDiff !== 1 ? 's' : ''}`
            : `${lineDiff} line${lineDiff !== -1 ? 's' : ''} removed`;
          lineInfo = `, ${lineChange}`;
        }
        console.log(`  ${marker} ${formatPath(r.filepath)} (${r.originalLength} → ${r.normalizedLength} bytes${lineInfo})`);
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
