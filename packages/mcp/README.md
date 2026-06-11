# @openkova/mcp

Local MCP server for `@openkova/core` — lets any MCP-compatible AI client (Claude Desktop, Cursor, Windsurf) take screenshots using your own local Chromium.

Runs entirely on your machine. No API keys, no external service, no cost per screenshot.

## Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "kova": {
      "command": "npx",
      "args": ["@openkova/mcp"]
    }
  }
}
```

### Cursor / Windsurf

Add to your MCP settings:

```json
{
  "kova": {
    "command": "npx",
    "args": ["@openkova/mcp"]
  }
}
```

Restart your AI client after adding the config.

## Requirements

A Chromium binary must be available. The easiest way is to install `puppeteer` globally or in the same project:

```bash
npm install -g puppeteer
# or set the path manually:
CHROMIUM_PATH=/usr/bin/chromium npx @openkova/mcp
```

## Tools

### `screenshot_url`

Screenshot a live URL.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` | string | ✓ | URL to screenshot (http/https, public hosts only) |
| `format` | `png\|jpeg\|webp\|pdf` | | Output format (default: `png`) |
| `viewport_width` | number | | Viewport width in px (default: `1280`) |
| `full_page` | boolean | | Capture full scrollable height (default: `false`) |
| `out` | string | | Output directory (default: `./kova-screenshots`) |

Returns the screenshot as an inline base64 image (so your AI can see it) plus the saved file path. PDF outputs return the file path only.

### `screenshot_snippet`

Render an HTML string and return the screenshot.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `html` | string | ✓ | HTML content to render |
| `name` | string | | Output filename without extension (default: `snippet`) |
| `format` | `png\|jpeg\|webp\|pdf` | | Output format (default: `png`) |
| `viewport_width` | number | | Viewport width in px (default: `1280`) |
| `full_page` | boolean | | Capture full scrollable height (default: `false`) |
| `out` | string | | Output directory (default: `./kova-screenshots`) |

### `crawl_url`

Crawl a site and screenshot every same-origin page. Returns a list of saved file paths.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` | string | ✓ | Root URL to crawl |
| `depth` | `1\|2` | | Crawl depth (default: `1`) |
| `format` | `png\|jpeg\|webp\|pdf` | | Output format (default: `png`) |
| `viewport_width` | number | | Viewport width in px (default: `1280`) |
| `full_page` | boolean | | Capture full scrollable height (default: `false`) |
| `out` | string | | Output directory (default: `./kova-screenshots`) |

## Output files

Screenshots are saved to `./kova-screenshots` by default. Override per call with the `out` parameter, or set `KOVA_OUTPUT_DIR` to change the default for all calls.

If a file with the same name already exists, a numeric suffix is appended (`-1`, `-2`, …).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `CHROMIUM_PATH` | auto-detected | Path to Chrome/Chromium binary |
| `KOVA_OUTPUT_DIR` | `./kova-screenshots` | Default output directory |
