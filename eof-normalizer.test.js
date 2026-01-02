#!/usr/bin/env node

/**
 * Unit tests for eof-normalizer.js
 * Run with: node eof-normalizer.test.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test utilities
const TEST_DIR = path.join(__dirname, 'test-temp');
let testCount = 0;
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`✓ Test ${testCount}: ${message}`);
  } else {
    failCount++;
    console.error(`✗ Test ${testCount}: ${message}`);
  }
}

function setupTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

function cleanupTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function createTestFile(filename, content) {
  // If filename is already an absolute path, use it directly
  // Otherwise, join it with TEST_DIR
  const filepath = path.isAbsolute(filename) ? filename : path.join(TEST_DIR, filename);
  // Ensure parent directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filepath, content, 'utf8');
  return filepath;
}

function readTestFile(filename) {
  // If filename is already an absolute path, use it directly
  // Otherwise, join it with TEST_DIR
  const filepath = path.isAbsolute(filename) ? filename : path.join(TEST_DIR, filename);
  return fs.readFileSync(filepath, 'utf8');
}

function runScript(args = []) {
  const scriptPath = path.join(__dirname, 'eof-normalizer.js');
  const cmd = `node "${scriptPath}" ${args.join(' ')}`;
  try {
    return execSync(cmd, { 
      cwd: TEST_DIR, 
      encoding: 'utf8',
      stdio: 'pipe'
    });
  } catch (error) {
    return error.stdout || error.message;
  }
}

// Test 1: Normalize CRLF to LF
function testCRLFtoLF() {
  console.log('\n--- Test: CRLF to LF conversion ---');
  setupTestDir();
  
  const content = 'line1\r\nline2\r\nline3\r\n';
  createTestFile('test1.js', content);
  
  runScript(['--dir', TEST_DIR, '--quiet']);
  
  const normalized = readTestFile('test1.js');
  assert(normalized === 'line1\nline2\nline3\n', 'CRLF should be converted to LF');
  
  cleanupTestDir();
}

// Test 2: Ensure single newline at EOF
function testSingleNewlineEOF() {
  console.log('\n--- Test: Single newline at EOF ---');
  setupTestDir();
  
  // Test file with multiple trailing newlines
  const content1 = 'content\n\n\n';
  createTestFile('test2.js', content1);
  runScript(['--dir', TEST_DIR, '--quiet']);
  const normalized1 = readTestFile('test2.js');
  assert(normalized1 === 'content\n', 'Multiple trailing newlines should become single');
  
  // Test file with no newline at EOF
  const content2 = 'content';
  createTestFile('test3.js', content2);
  runScript(['--dir', TEST_DIR, '--quiet']);
  const normalized2 = readTestFile('test3.js');
  assert(normalized2 === 'content\n', 'File without EOF newline should get one');
  
  // Test file with trailing spaces and newlines
  const content3 = 'content   \n\n  \n';
  createTestFile('test4.js', content3);
  runScript(['--dir', TEST_DIR, '--quiet']);
  const normalized3 = readTestFile('test4.js');
  assert(normalized3 === 'content\n', 'Trailing spaces and newlines should be normalized');
  
  cleanupTestDir();
}

// Test 3: File extension filtering
function testExtensionFiltering() {
  console.log('\n--- Test: File extension filtering ---');
  setupTestDir();
  
  createTestFile('test.js', 'content\n');
  createTestFile('test.ts', 'content\n');
  createTestFile('test.txt', 'content\n');
  createTestFile('test.xyz', 'content\n'); // Should be ignored
  
  runScript(['--dir', TEST_DIR, '--ext', '.js,.ts', '--quiet']);
  
  // .xyz file should not be modified (no newline added)
  const xyzContent = readTestFile('test.xyz');
  assert(xyzContent === 'content\n', '.xyz file should not be processed');
  
  cleanupTestDir();
}

// Test 4: Skip directories
function testSkipDirectories() {
  console.log('\n--- Test: Skip directories ---');
  setupTestDir();
  
  const skipDir = path.join(TEST_DIR, 'node_modules');
  fs.mkdirSync(skipDir, { recursive: true });
  createTestFile(path.join(skipDir, 'test.js'), 'content\r\n');
  
  runScript(['--dir', TEST_DIR, '--quiet']);
  
  // File in node_modules should not be modified
  const skippedContent = fs.readFileSync(path.join(skipDir, 'test.js'), 'utf8');
  assert(skippedContent === 'content\r\n', 'Files in skipped directories should not be processed');
  
  cleanupTestDir();
}

// Test 5: Special filenames
function testSpecialFilenames() {
  console.log('\n--- Test: Special filenames ---');
  setupTestDir();
  
  createTestFile('.gitignore', 'content\r\n');
  createTestFile('.gitkeep', 'content\r\n');
  createTestFile('.env.example', 'content\r\n');
  
  runScript(['--dir', TEST_DIR, '--quiet']);
  
  const gitignore = readTestFile('.gitignore');
  const gitkeep = readTestFile('.gitkeep');
  const envExample = readTestFile('.env.example');
  
  assert(gitignore === 'content\n', '.gitignore should be processed');
  assert(gitkeep === 'content\n', '.gitkeep should be processed');
  assert(envExample === 'content\n', '.env.example should be processed');
  
  cleanupTestDir();
}

// Test 6: Dry run mode
function testDryRun() {
  console.log('\n--- Test: Dry run mode ---');
  setupTestDir();
  
  const content = 'content\r\n';
  createTestFile('test.js', content);
  
  runScript(['--dir', TEST_DIR, '--dry-run', '--quiet']);
  
  // File should not be modified in dry-run mode
  const unchanged = readTestFile('test.js');
  assert(unchanged === content, 'File should not be modified in dry-run mode');
  
  cleanupTestDir();
}

// Test 7: Multiple directories
function testMultipleDirectories() {
  console.log('\n--- Test: Multiple directories ---');
  setupTestDir();
  
  const dir1 = path.join(TEST_DIR, 'dir1');
  const dir2 = path.join(TEST_DIR, 'dir2');
  fs.mkdirSync(dir1, { recursive: true });
  fs.mkdirSync(dir2, { recursive: true });
  
  createTestFile(path.join(dir1, 'test1.js'), 'content\r\n');
  createTestFile(path.join(dir2, 'test2.js'), 'content\r\n');
  
  runScript(['--dir', dir1, '--dir', dir2, '--quiet']);
  
  const test1 = fs.readFileSync(path.join(dir1, 'test1.js'), 'utf8');
  const test2 = fs.readFileSync(path.join(dir2, 'test2.js'), 'utf8');
  
  assert(test1 === 'content\n', 'File in dir1 should be normalized');
  assert(test2 === 'content\n', 'File in dir2 should be normalized');
  
  cleanupTestDir();
}

// Test 8: Already normalized files
function testAlreadyNormalized() {
  console.log('\n--- Test: Already normalized files ---');
  setupTestDir();
  
  const content = 'content\n'; // Already normalized
  createTestFile('test.js', content);
  
  const output = runScript(['--dir', TEST_DIR]);
  
  // File should remain unchanged
  const unchanged = readTestFile('test.js');
  assert(unchanged === content, 'Already normalized file should remain unchanged');
  assert(output.includes('No changes needed') || output.includes('Fixed 0'), 'Should report no changes needed');
  
  cleanupTestDir();
}

// Test 9: Empty file
function testEmptyFile() {
  console.log('\n--- Test: Empty file ---');
  setupTestDir();
  
  createTestFile('empty.js', '');
  
  runScript(['--dir', TEST_DIR, '--quiet']);
  
  const normalized = readTestFile('empty.js');
  assert(normalized === '\n', 'Empty file should get a single newline');
  
  cleanupTestDir();
}

// Test 10: File with only newlines
function testOnlyNewlines() {
  console.log('\n--- Test: File with only newlines ---');
  setupTestDir();
  
  createTestFile('newlines.js', '\n\n\n');
  
  runScript(['--dir', TEST_DIR, '--quiet']);
  
  const normalized = readTestFile('newlines.js');
  assert(normalized === '\n', 'Multiple newlines should become single');
  
  cleanupTestDir();
}

// Run all tests
console.log('Running EOF Normalizer Tests\n');
console.log('='.repeat(50));

testCRLFtoLF();
testSingleNewlineEOF();
testExtensionFiltering();
testSkipDirectories();
testSpecialFilenames();
testDryRun();
testMultipleDirectories();
testAlreadyNormalized();
testEmptyFile();
testOnlyNewlines();

// Summary
console.log('\n' + '='.repeat(50));
console.log(`\nTest Summary:`);
console.log(`  Total: ${testCount}`);
console.log(`  Passed: ${passCount}`);
console.log(`  Failed: ${failCount}`);

if (failCount === 0) {
  console.log('\n✅ All tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
}
