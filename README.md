# Match Report — Time Converter

Chrome extension (Manifest V3) that opens football match report PDFs from a URL, converts clock-style event times to **game minutes**, and shows the result as a visual overlay. Text in the PDF remains **selectable and copyable**.

## Install

1. Install [Node.js](https://nodejs.org/) (for PDF.js setup only).
2. In this folder, run:

```bash
npm run copy-pdfjs
```

3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder.

## Usage

1. Click the extension icon.
2. Paste a direct PDF link (e.g. CBF match report URL).
3. Click **Open** — the viewer loads the PDF.
4. Use the URL bar in the viewer to load another report.
5. Select and copy player names and other text as usual.

Recent links (last 5) appear in the URL field suggestions. Use **Clear history** to remove them.

## Time conversion rules

| PDF pattern | Period | Game minute | On-page overlay |
|-------------|--------|-------------|-----------------|
| `12:00` | `1T` | `12'` | *(none — same minute)* |
| `08:00` | `2T` | `53'` | `53:00` |
| `39:00` | `2T` | `84'` | `84:00` |
| `-` | `INT` | `46'` | `46:00` |
| `+02:00` | `2T` | `90+2'` | `90+2` |
| `+10:00` | `2T` | `90+10'` | `90+10` |

**Stoppage:** if the time starts with `+` (e.g. `+02:00 2T`), the result is always **`90+N'`** (not `45+N`).

The `1T` / `2T` / `INT` column is never changed — only the time cell when the value differs.

## Development

```bash
npm test
```

Open the viewer with `?dev=1` for quick console asserts.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| PDF.js 404 | Run `npm run copy-pdfjs` and reload the extension |
| Empty PDF error | Check the link returns a real PDF |
| “No selectable text” | PDF may be scanned (image only) |
| “No time patterns found” | Layout may differ from expected súmula format |

## Privacy

All processing is local in the browser. No data is sent to external servers except downloading the PDF URL you provide.
