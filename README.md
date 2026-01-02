# EOF Normalizer

A simple Node.js script that fixes line endings in your code files. Converts Windows-style line endings (CRLF) to Unix-style (LF) and ensures all files end with exactly one newline.

## ⚠️ Important: Backup Your Files First!

**Before running this script, please backup your files!** This script modifies files on your system. While it's designed to be safe, the author is not liable for any file damage or data loss that may occur during normalization. Always use the `--dry-run` mode first to preview changes, and ensure you have backups before making any modifications.

## 🚀 Quick Start

### 1. Install Node.js

**You need Node.js installed to run this script.** If you don't have it yet:

- **Download Node.js:** [https://nodejs.org/](https://nodejs.org/)
- Choose the LTS (Long Term Support) version for best stability
- After installation, verify it works by running: `node --version`

### 2. Download the script

Download `eof-normalizer.js` to your project folder.

### 3. Test it first (recommended)

```bash
# Preview what would change without modifying files
node eof-normalizer.js --dry-run
```

### 4. Run it (after backing up!)

```bash
node eof-normalizer.js
```

That's it! The script will automatically:
- Find all code files in your project
- Fix their line endings
- Make sure they end with a single newline

## 📁 Project Files

**For most users, you only need `eof-normalizer.js` - that's the main script!**

Here's what each file in this repository is for:

| File | Purpose | Do You Need It? |
|------|---------|-----------------|
| **`eof-normalizer.js`** | **The main script - this is what you run!** | ✅ **Yes - this is all you need!** |
| `eof-normalizer.test.js` | Unit tests to verify the script works correctly | ❌ No - only for developers |
| `README.md` | This documentation file | 📖 Helpful to read, but not required |
| `LICENSE` | MIT License file | ❌ No - just legal info |
| `package.json` | npm/pnpm configuration for development | ❌ No - only for developers who want to run tests/linting |
| `eslint.config.js` | ESLint configuration for code quality | ❌ No - only for developers |
| `.gitignore` | Git ignore rules | ❌ No - only for version control |

**Bottom line:** Just download `eof-normalizer.js` and run it with Node.js. That's all you need!

## 📋 What It Does

- ✅ Converts `\r\n` (Windows) → `\n` (Unix/Mac)
- ✅ Removes extra blank lines at the end of files
- ✅ Adds a newline if a file is missing one
- ✅ Skips `node_modules`, `.git`, and other build folders automatically

## 💡 Common Usage

**Always use `--dry-run` first to preview changes!**

```bash
# Preview what would change (SAFE - no files modified)
node eof-normalizer.js --dry-run

# Fix all files in current directory (after backing up!)
node eof-normalizer.js

# Fix only files in a specific folder
node eof-normalizer.js --dir src

# Fix only specific file types
node eof-normalizer.js --ext .ts,.tsx,.js
```

## 🧪 Testing

Run the test suite to verify everything works:

```bash
node eof-normalizer.test.js
```

## 📖 All Options

| Option | What It Does |
|--------|--------------|
| `--dir <path>` | Scan a specific folder (default: current folder) |
| `--ext <extensions>` | Only process these file types (e.g., `.ts,.js`) |
| `--skip <dirs>` | Skip these folders (e.g., `node_modules,.git`) |
| `--dry-run` | Show what would change without modifying files |
| `--quiet` | Only show summary (useful for automation) |
| `--help` | Show full help message |

## 🔧 Requirements

- **Node.js** (any recent version) - [Download here](https://nodejs.org/)
- **No dependencies** - uses only built-in Node.js modules

> **Don't have Node.js?** Visit [nodejs.org](https://nodejs.org/) to download and install it. The LTS (Long Term Support) version is recommended.

## 📝 Examples

### TypeScript/JavaScript Project
```bash
node eof-normalizer.js --dir src --ext .ts,.tsx,.js,.jsx
```

### Preview Before Running
```bash
# See what would change
node eof-normalizer.js --dry-run

# If it looks good, run for real
node eof-normalizer.js
```

### Add to npm Scripts

Add this to your `package.json`:

```json
{
  "scripts": {
    "normalize": "node eof-normalizer.js"
  }
}
```

Then run:
```bash
npm run normalize
```

## 🐛 Troubleshooting

**"Cannot find module" or "node is not recognized" error?**
- Make sure Node.js is installed: `node --version`
- If Node.js is not installed, download it from [nodejs.org](https://nodejs.org/)
- After installing, you may need to restart your terminal/command prompt

**Script doesn't change files?**
- Try `--dry-run` first to see what would change
- Check that you have write permissions
- Make sure the file types you want are included (use `--ext` if needed)

**Too many files being processed?**
- Use `--ext` to limit file types
- Use `--skip` to exclude folders
- Use `--dir` to scan only specific folders

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Disclaimer:** This software is provided "as is" without warranty of any kind. The author is not liable for any file damage, data loss, or other issues that may occur from using this script. Users are responsible for backing up their files before running the normalization process. Always use the `--dry-run` mode first to preview changes.

## 🤝 Contributing

Found a bug or want to add a feature? Feel free to open an issue or submit a pull request!
