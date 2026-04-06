# Daylight Style Eval

This eval compares your local UI against [Daylight Computer](https://daylightcomputer.com/) using:

- Screenshot descriptor similarity (tone, warmth, saturation, edge density)
- Motion similarity (idle, pointer interaction, scroll response)
- DOM style similarity (typography, radius, shadows, animation footprint)

It supports two modes:

- `replica`: stricter, intended for near-1:1 reproduction work
- `style-transfer`: more appropriate when preserving product content while borrowing Daylight's visual language

## Run

From `/Users/chenshipeng/Documents/project/codex-project/thinking/Self-agent`:

```bash
npm exec --yes --package=playwright node scripts/eval-daylight-style.mjs --target http://localhost:3000
```

For style-transfer work:

```bash
node scripts/eval-daylight-style.mjs --target http://localhost:3000/preview --mode style-transfer
```

If Playwright browser binaries are missing:

```bash
npx playwright install chromium
```

## Output

Each run creates:

- `eval/daylight-style-runs/<timestamp>/report.json`
- `eval/daylight-style-runs/<timestamp>/summary.md`
- Reference and target screenshots for hero/idle/pointer/scroll comparisons

The report marks pass/fail using mode-specific thresholds.

Default gates:

- `replica`
- `overallScore >= 0.78`
- `screenshotSimilarity >= 0.70`
- `motionSimilarity >= 0.55`

- `style-transfer`
- `overallScore >= 0.64`
- `screenshotSimilarity >= 0.45`
- `motionSimilarity >= 0.55`
