# @openkova/cli

Command-line interface for `@openkova/core` — screenshot URLs, local HTML files, and inline HTML snippets from the terminal.

Runs entirely locally. Uses your own Chromium — no network calls to any external service.

## Install

```bash
npm install -g @openkova/cli
# or run without installing:
npx @openkova/cli --help
```

## Chromium

**Most users need no extra setup.** The CLI auto-detects Chrome/Chromium in this order:

1. `CHROMIUM_PATH` env var (if set)
2. The `puppeteer` npm package (if installed — it bundles its own Chrome)
3. A system-installed browser at the standard path for your OS

If you have Google Chrome or Chromium already installed, `kova` works as-is.

**No browser found?** Install `puppeteer` once:

```bash
npm install -g puppeteer
```

Or point directly at any Chrome/Chromium binary:

```bash
CHROMIUM_PATH=/usr/bin/chromium kova screenshot https://example.com
```

## Commands

### `kova screenshot <url|file>`

Screenshot a live URL or a local `.html` file.

```bash
kova screenshot https://example.com
kova screenshot ./index.html --format pdf --out ./output/
```

### `kova snippet`

Render an HTML string passed via `--html` or piped from stdin.

```bash
kova snippet --html '<h1>Hello</h1>' --name hello
echo '<h1>Hello</h1>' | kova snippet --name hello
```

### `kova crawl <url>`

Crawl a site, discover all same-origin pages, and screenshot each one.

```bash
kova crawl https://example.com --depth 2 --format jpeg --out ./screenshots/
```

## Flags

| Flag | Default | Description |
|---|---|---|
| `--format` | `png` | Output format: `png`, `jpeg`, `webp`, `pdf` |
| `--viewport` | `1280` | Width in px, or `mobile` (390), `desktop` (1280), `wide` (1920) |
| `--full-page` | off | Capture full scrollable height |
| `--out` | `.` | Output directory |
| `--depth` | `1` | Crawl depth (`1` or `2`), `crawl` command only |
| `--name` | `snippet` | Output filename without extension, `snippet` command only |

## Output filenames

- `screenshot` — derived from the URL hostname + path, e.g. `example.com.png`
- `snippet` — uses `--name` value, e.g. `hello.png`
- `crawl` — one file per page, named from the URL slug

If a file with the same name already exists in `--out`, a numeric suffix is appended (`-1`, `-2`, …).

## Environment variables

| Variable | Description |
|---|---|
| `CHROMIUM_PATH` | Path to Chrome/Chromium binary (auto-detected if unset) |
