# EOF Normalizer — CLI, CI & Dev Utility

**EOF Normalizer** is a tiny **Node.js CLI tool** that **normalises end‑of‑file newlines**, converts **CRLF → LF**, and removes **unwanted trailing blank lines**.

Whether you're cleaning up formatting inconsistencies, fixing line ending drift in mixed‑OS teams, or dealing with editors that add extra blank lines (such as the [Cursor editor issue](https://forum.cursor.com/t/the-cursor-adds-blank-lines/143373)), this tool helps keep your codebase consistent.

If you've ever seen noisy diffs like "+1 blank line" or CI churn because of line ending drift, this tool is for you.

---

## What it does

- ✅ Converts Windows line endings **CRLF (`\r\n`) → LF (`\n`)**
- ✅ Ensures **exactly one** newline at EOF
- ✅ Removes **extra blank lines at end of file**
- ✅ Recursively scans a folder
- ✅ Skips common directories (e.g. `node_modules`, `.git`, build outputs)
- ✅ **Respects `.gitignore` files** (automatically skips binaries, generated files, etc.)
- ✅ Supports **dry‑run** mode (preview without changes)
- ✅ Works with **any language** (TS/JS/Python/Go/Rust/C#/C++/Pascal/Vue/etc.)

---

## Why you might use it

- 🧹 Clean diffs before commits (remove unwanted formatting changes)
- 🚦 Enforce newline consistency in **CI**
- 🔁 Mixed‑OS repos: Windows + macOS + Linux teams
- 🧠 Fix editors that add extra blank lines (including Cursor editor)
- 🛠️ General **formatting/normalisation** utility for any project

---

## Requirements

- **Node.js** (recent version recommended)
  - Download: https://nodejs.org (LTS is ideal)
- **No dependencies required** (built-in Node APIs only)
  - Optional: Install `ignore` package for enhanced gitignore pattern matching:
    ```bash
    npm install ignore
    ```
    (Works fine without it, but the `ignore` package provides more accurate gitignore parsing)

---

## Quick start

### 1) Put the script in your repo

You only need:

```
eof-normalizer.js
```

### 2) Preview changes (recommended)

```bash
node eof-normalizer.js --dry-run
```

### 3) Apply changes

```bash
node eof-normalizer.js
```

### Alternative: Script in a different location

If you put the script in a different directory (e.g., `tools/` or a shared location), you can specify the directory to scan:

```bash
# Script in tools/, scanning src/ directory
node tools/eof-normalizer.js --dir src --dry-run

# Script in parent directory, scanning current directory
node ../eof-normalizer.js --dir . --dry-run

# Using a .gitignore from the scanned directory
node tools/eof-normalizer.js --dir src --gitignore src/.gitignore --dry-run

# Paths with spaces must be quoted
node "C:/My Tools/eof-normalizer.js" --dir "My Project/src" --dry-run
```

**Note:** Replace `tools/eof-normalizer.js` with your script path, `src` with your target directory, and `src/.gitignore` with the path to the `.gitignore` file in the directory you're scanning.

---

## CLI usage

```bash
node eof-normalizer.js [options]
```

### Options

| Option | Description |
|------|------------|
| `--dir <path>` | Directory to scan (default: current directory) |
| `--ext <list>` | File extensions to process (e.g. `.ts,.js,.py`) |
| `--skip <list>` | Folders to skip (comma-separated) |
| `--gitignore <file>` | Path to `.gitignore` file (default: `./.gitignore` if exists) |
| `--no-gitignore` | Disable gitignore filtering |
| `--dry-run` | Preview changes without modifying files |
| `--quiet` | Minimal output (useful for CI) |
| `--help` | Show help |

---

## Examples

### All languages (default - now includes C#, C++, Go, Rust, Pascal, Vue, and more)
```bash
node eof-normalizer.js
```

### TypeScript / JavaScript / Vue / Angular
```bash
node eof-normalizer.js --dir src --ext .ts,.tsx,.js,.jsx,.vue
```

### C# / .NET
```bash
node eof-normalizer.js --dir . --ext .cs,.csx
```

### C / C++
```bash
node eof-normalizer.js --dir . --ext .c,.cpp,.h,.hpp,.hxx,.cxx,.cc
```

### Go
```bash
node eof-normalizer.js --dir . --ext .go
```

### Rust
```bash
node eof-normalizer.js --dir . --ext .rs
```

### Pascal / Delphi
```bash
node eof-normalizer.js --dir . --ext .pas,.pp,.p
```

### Python / Markdown / YAML
```bash
node eof-normalizer.js --ext .py,.md,.yml,.yaml,.json
```

### Using with .gitignore (recommended)
```bash
# Automatically uses ./.gitignore if it exists
node eof-normalizer.js

# Use a custom gitignore file
node eof-normalizer.js --gitignore .myignore

# Disable gitignore filtering
node eof-normalizer.js --no-gitignore
```

**Note about gitignore support:** The `.gitignore` feature was added to help distinguish source files from generated files, binaries, and build artifacts across all project types (C#, C++, Go, Rust, Python, JavaScript, etc.). Since `.gitignore` files are language-agnostic and commonly used to exclude non-source files, this provides a universal way to identify which files should be normalized.

The built-in parser handles most common patterns, but has some limitations (particularly with complex negation patterns). If you need more accurate gitignore matching, you can install the optional `ignore` package:

```bash
npm install ignore
```

The tool will automatically detect and use the `ignore` package if it's available, providing more robust pattern matching that closely follows git's behavior.

### Example: Scanning a different directory with custom gitignore

When scanning a directory outside your current location, you can specify both the target directory and its `.gitignore` file:

```bash
node eof-normalizer.js --dir "C:\Dev\MyProject" --gitignore "C:\Dev\MyProject\.gitignore" --dry-run
```

**Sample output:**

```
Starting EOF normalization...

🔍 DRY RUN MODE - No files will be modified

Using .gitignore rules (built-in parser): C:\Dev\MyProject\.gitignore

Scanning directories...
  C:\Dev\MyProject: found 2761 files

Total files to scan: 2761

Processing files...

--- Results ---

Would fix 100 file(s):
  🔍 C:\Dev\MyProject\.github\renovate.json (2324 → 2257 bytes, +1 line)
  🔍 C:\Dev\MyProject\.github\scripts\check-schema-drift.sh (1765 → 1764 bytes, -1 line removed)
  🔍 C:\Dev\MyProject\.github\workflows\ci.yml (14799 → 14797 bytes, -2 lines removed)
  🔍 C:\Dev\MyProject\.secrets\dev\.gitkeep (56 → 53 bytes, -1 line removed)
  🔍 C:\Dev\MyProject\.secrets\prod\.gitkeep (56 → 53 bytes, -1 line removed)
  🔍 C:\Dev\MyProject\.secrets\README.md (2015 → 2014 bytes, -1 line removed)
  🔍 C:\Dev\MyProject\.serena\.gitignore (8 → 7 bytes)
  ... (93 more files)

Would fix 100 of 2761 files.
```

### Basic workflow

First, preview what would be changed:

```bash
node eof-normalizer.js --dry-run
```

After reviewing the results, apply the changes:

```bash
node eof-normalizer.js
```

---

## Pre-commit hook (example)

You’ve got two common approaches:

### Option A: Simple Git hook (no dependencies)

Create `.git/hooks/pre-commit` (no file extension) with:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Normalise files
node eof-normalizer.js --quiet

# Fail commit if anything changed (forces you to stage the changes)
if ! git diff --quiet; then
  echo "EOF Normalizer updated files. Please review and stage changes, then re-commit."
  git status --porcelain
  exit 1
fi
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

**Notes**
- This runs locally only (hooks are not committed by default).
- It prevents “hidden” formatting changes slipping into commits.

---

### Option B: Husky (shareable hooks for Node projects)

Install Husky:

```bash
npm i -D husky
npx husky init
```

Add a `pre-commit` hook:

```bash
npx husky add .husky/pre-commit "node eof-normalizer.js --quiet && git diff --quiet || (echo 'EOF Normalizer updated files. Stage changes and retry.' && git status --porcelain && exit 1)"
```

Now the hook is committed and shared with the team.

---

## GitHub Actions (CI snippet)

This workflow **fails CI if EOF Normalizer would change any files**.

Create `.github/workflows/eof-normalizer.yml`:

```yaml
name: EOF Normalizer

on:
  pull_request:
  push:
    branches: [ main, master ]

jobs:
  eof-normalizer:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Run EOF Normalizer
        run: |
          node eof-normalizer.js --quiet

      - name: Fail if files changed
        run: |
          git diff --exit-code
```

**How it works**
- Runs the normalizer
- If it modified anything, `git diff --exit-code` returns non‑zero and CI fails
- The PR author then runs the tool locally and commits the normalised changes

---

## Repo contents

| File | Purpose |
|---|---|
| **`eof-normalizer.js`** | The CLI utility (most users only need this) |
| `eof-normalizer.test.js` | Tests |
| `README.md` | Documentation |
| `LICENSE` | MIT |
| `package.json` | Dev tooling |
| `eslint.config.js` | Lint config |
| `.cursor/rules/javascript-coding-standards.mdc` | Cursor IDE coding standards rules |
| `.gitignore` | Git hygiene |

---

## Safety

⚠️ This tool **modifies files**.

- Use `--dry-run` first
- Commit / back up before applying changes
- Provided “as is” under the MIT license (no warranty)

---

## SEO keywords (for discoverability)

Cursor blank lines, Cursor adds blank lines, EOF newline, end-of-file newline, newline normalizer, CRLF to LF, line endings, trailing whitespace, trailing blank lines, formatting tool, pre-commit hook, GitHub Actions CI check.

---

## License

MIT — see `LICENSE`.
