#!/usr/bin/env node

import { inflateSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const DEFAULTS = {
  target: "http://localhost:3000",
  reference: "https://daylightcomputer.com/",
  out: "eval/daylight-style-runs",
  threshold: null,
  mode: "style-transfer",
  viewportWidth: 1440,
  viewportHeight: 960,
};

function parseArgs(argv) {
  const args = { ...DEFAULTS };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--target" && next) {
      args.target = next;
      i += 1;
      continue;
    }
    if (token === "--reference" && next) {
      args.reference = next;
      i += 1;
      continue;
    }
    if (token === "--out" && next) {
      args.out = next;
      i += 1;
      continue;
    }
    if (token === "--threshold" && next) {
      args.threshold = Number(next);
      i += 1;
      continue;
    }
    if (token === "--mode" && next) {
      args.mode = next;
      i += 1;
      continue;
    }
    if (token === "--width" && next) {
      args.viewportWidth = Number(next);
      i += 1;
      continue;
    }
    if (token === "--height" && next) {
      args.viewportHeight = Number(next);
      i += 1;
      continue;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Daylight style evaluation for Self-agent UI.

Usage:
  node scripts/eval-daylight-style.mjs [options]

Options:
  --target <url>       Target app URL (default: ${DEFAULTS.target})
  --reference <url>    Reference style URL (default: ${DEFAULTS.reference})
  --out <dir>          Output directory (default: ${DEFAULTS.out})
  --mode <name>        Evaluation mode: replica | style-transfer (default: ${DEFAULTS.mode})
  --threshold <n>      Pass threshold in [0,1] (default depends on mode)
  --width <px>         Viewport width (default: ${DEFAULTS.viewportWidth})
  --height <px>        Viewport height (default: ${DEFAULTS.viewportHeight})
  -h, --help           Show this help

Examples:
  npm exec --yes --package=playwright node scripts/eval-daylight-style.mjs --target http://localhost:3000
  npm exec --yes --package=playwright node scripts/eval-daylight-style.mjs --target http://localhost:3000 --mode replica
  npm exec --yes --package=playwright node scripts/eval-daylight-style.mjs --target http://localhost:3000/preview --mode style-transfer
`);
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function similarityWithTolerance(a, b, tolerance) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  if (tolerance <= 0) return a === b ? 1 : 0;
  return clamp(1 - Math.abs(a - b) / tolerance);
}

function parseDurationSeconds(raw) {
  if (!raw || raw === "0s" || raw === "0ms") return 0;
  const values = raw.split(",").map((v) => v.trim());
  return values.reduce((max, token) => {
    if (token.endsWith("ms")) return Math.max(max, Number.parseFloat(token) / 1000);
    if (token.endsWith("s")) return Math.max(max, Number.parseFloat(token));
    return max;
  }, 0);
}

function parseBoxShadowBlur(raw) {
  if (!raw || raw === "none") return 0;
  const first = raw.split(",")[0];
  const nums = first.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 3) return 0;
  return Number.parseFloat(nums[2]) || 0;
}

function scoreMotionDiff(diff) {
  const changed = clamp(diff.changedRatio, 0, 1);
  const mean = clamp(diff.meanLumaDiff, 0, 1);
  return changed * 0.7 + mean * 0.3;
}

function toHexByte(value) {
  const b = clamp(Math.round(value), 0, 255);
  return b.toString(16).padStart(2, "0");
}

function rgbToHex({ r, g, b }) {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function decodePng(buffer) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buffer.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error("Unsupported image format: expected PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatParts = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const type = buffer.toString("ascii", offset, offset + 4);
    offset += 4;
    const data = buffer.subarray(offset, offset + length);
    offset += length;
    offset += 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatParts.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (!width || !height) {
    throw new Error("Invalid PNG: missing IHDR");
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(
      `Unsupported PNG encoding (bitDepth=${bitDepth}, colorType=${colorType})`
    );
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatParts));
  const out = new Uint8Array(width * height * 4);

  let inOffset = 0;
  let outOffset = 0;
  const prev = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inOffset];
    inOffset += 1;

    const row = new Uint8Array(stride);
    row.set(inflated.subarray(inOffset, inOffset + stride));
    inOffset += stride;

    switch (filter) {
      case 0:
        break;
      case 1:
        for (let i = bytesPerPixel; i < stride; i += 1) {
          row[i] = (row[i] + row[i - bytesPerPixel]) & 0xff;
        }
        break;
      case 2:
        for (let i = 0; i < stride; i += 1) {
          row[i] = (row[i] + prev[i]) & 0xff;
        }
        break;
      case 3:
        for (let i = 0; i < stride; i += 1) {
          const left = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
          const up = prev[i];
          row[i] = (row[i] + Math.floor((left + up) / 2)) & 0xff;
        }
        break;
      case 4:
        for (let i = 0; i < stride; i += 1) {
          const left = i >= bytesPerPixel ? row[i - bytesPerPixel] : 0;
          const up = prev[i];
          const upLeft = i >= bytesPerPixel ? prev[i - bytesPerPixel] : 0;
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
          row[i] = (row[i] + predictor) & 0xff;
        }
        break;
      default:
        throw new Error(`Unsupported PNG filter type: ${filter}`);
    }

    if (colorType === 6) {
      out.set(row, outOffset);
      outOffset += stride;
    } else {
      for (let i = 0; i < stride; i += 3) {
        out[outOffset] = row[i];
        out[outOffset + 1] = row[i + 1];
        out[outOffset + 2] = row[i + 2];
        out[outOffset + 3] = 255;
        outOffset += 4;
      }
    }
    prev.set(row);
  }

  return { width, height, data: out };
}

function computeImageDescriptor(png, sampleStep = 4) {
  const { width, height, data } = png;
  let sampleCount = 0;

  let lumaSum = 0;
  let lumaSqSum = 0;
  let saturationSum = 0;
  let warmRatioCount = 0;
  let warmPaperCount = 0;
  let brightCount = 0;
  let darkCount = 0;
  let edgeCount = 0;
  let edgeTotal = 0;

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const idx = (y * width + x) * 4;
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;
      const a = data[idx + 3] / 255;
      if (a < 0.05) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      sampleCount += 1;
      lumaSum += luma;
      lumaSqSum += luma * luma;
      saturationSum += sat;
      if (r > g && g > b * 0.95) warmRatioCount += 1;
      if (r > 0.7 && g > 0.62 && b > 0.5 && sat < 0.35 && r >= g && g >= b) {
        warmPaperCount += 1;
      }
      if (luma > 0.78) brightCount += 1;
      if (luma < 0.22) darkCount += 1;

      if (x + sampleStep < width) {
        const idxRight = (y * width + (x + sampleStep)) * 4;
        const r2 = data[idxRight] / 255;
        const g2 = data[idxRight + 1] / 255;
        const b2 = data[idxRight + 2] / 255;
        const l2 = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
        edgeTotal += 1;
        if (Math.abs(luma - l2) > 0.085) edgeCount += 1;
      }
      if (y + sampleStep < height) {
        const idxDown = ((y + sampleStep) * width + x) * 4;
        const r3 = data[idxDown] / 255;
        const g3 = data[idxDown + 1] / 255;
        const b3 = data[idxDown + 2] / 255;
        const l3 = 0.2126 * r3 + 0.7152 * g3 + 0.0722 * b3;
        edgeTotal += 1;
        if (Math.abs(luma - l3) > 0.085) edgeCount += 1;
      }
    }
  }

  const meanLuma = sampleCount ? lumaSum / sampleCount : 0;
  const variance = sampleCount ? lumaSqSum / sampleCount - meanLuma * meanLuma : 0;

  return {
    sampleCount,
    meanLuma,
    lumaStdDev: Math.sqrt(Math.max(0, variance)),
    meanSaturation: sampleCount ? saturationSum / sampleCount : 0,
    warmRatio: sampleCount ? warmRatioCount / sampleCount : 0,
    warmPaperRatio: sampleCount ? warmPaperCount / sampleCount : 0,
    brightRatio: sampleCount ? brightCount / sampleCount : 0,
    darkRatio: sampleCount ? darkCount / sampleCount : 0,
    edgeDensity: edgeTotal ? edgeCount / edgeTotal : 0,
  };
}

function compareFrames(before, after, sampleStep = 2) {
  const a = decodePng(before);
  const b = decodePng(after);
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `Image size mismatch: (${a.width}x${a.height}) vs (${b.width}x${b.height})`
    );
  }

  const width = a.width;
  const height = a.height;

  let diffCount = 0;
  let total = 0;
  let lumaDiffSum = 0;

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const idx = (y * width + x) * 4;
      const l1 =
        0.2126 * a.data[idx] / 255 +
        0.7152 * a.data[idx + 1] / 255 +
        0.0722 * a.data[idx + 2] / 255;
      const l2 =
        0.2126 * b.data[idx] / 255 +
        0.7152 * b.data[idx + 1] / 255 +
        0.0722 * b.data[idx + 2] / 255;

      const d = Math.abs(l1 - l2);
      total += 1;
      lumaDiffSum += d;
      if (d > 0.04) diffCount += 1;
    }
  }

  return {
    changedRatio: total ? diffCount / total : 0,
    meanLumaDiff: total ? lumaDiffSum / total : 0,
  };
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function captureSiteMetrics(context, siteName, url, runDir, viewport) {
  const page = await context.newPage({ viewport });
  const siteDir = path.join(runDir, siteName);
  await mkdir(siteDir, { recursive: true });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
  }

  await page.waitForTimeout(1800);

  const heroShotPath = path.join(siteDir, "hero.png");
  const idleBeforePath = path.join(siteDir, "idle-before.png");
  const idleAfterPath = path.join(siteDir, "idle-after.png");
  const pointerBeforePath = path.join(siteDir, "pointer-before.png");
  const pointerAfterPath = path.join(siteDir, "pointer-after.png");
  const scrollBeforePath = path.join(siteDir, "scroll-before.png");
  const scrollAfterPath = path.join(siteDir, "scroll-after.png");

  const heroBuffer = await page.screenshot({
    path: heroShotPath,
    fullPage: false,
    animations: "allow",
  });

  const domMetrics = await page.evaluate(() => {
    const px = (value) => {
      const n = Number.parseFloat(String(value || "0"));
      return Number.isFinite(n) ? n : 0;
    };

    const parseRgb = (raw) => {
      if (!raw) return { r: 0, g: 0, b: 0 };
      const m = raw.match(/rgba?\(([^)]+)\)/i);
      if (!m) return { r: 0, g: 0, b: 0 };
      const parts = m[1].split(",").map((p) => Number.parseFloat(p.trim()));
      return {
        r: Number.isFinite(parts[0]) ? parts[0] : 0,
        g: Number.isFinite(parts[1]) ? parts[1] : 0,
        b: Number.isFinite(parts[2]) ? parts[2] : 0,
      };
    };

    const all = Array.from(document.querySelectorAll("*")).slice(0, 1500);
    const headingEls = Array.from(document.querySelectorAll("h1, h2, h3")).slice(0, 100);
    const interactiveEls = Array.from(
      document.querySelectorAll("button, a, input, textarea, [role='button']")
    ).slice(0, 250);

    const headingSerifCount = headingEls.filter((el) => {
      const family = getComputedStyle(el).fontFamily.toLowerCase();
      return family.includes("serif") && !family.includes("sans");
    }).length;

    const headingTextSizes = headingEls.map((el) => px(getComputedStyle(el).fontSize));
    const radii = interactiveEls.map((el) => px(getComputedStyle(el).borderRadius));
    const shadowBlur = interactiveEls.map((el) => {
      const shadow = getComputedStyle(el).boxShadow;
      if (!shadow || shadow === "none") return 0;
      const nums = shadow.match(/-?\d+(\.\d+)?/g);
      if (!nums || nums.length < 3) return 0;
      const blur = Number.parseFloat(nums[2]);
      return Number.isFinite(blur) ? blur : 0;
    });

    const transitions = all.map((el) =>
      Math.max(
        ...getComputedStyle(el)
          .transitionDuration.split(",")
          .map((v) => {
            const t = v.trim();
            if (t.endsWith("ms")) return Number.parseFloat(t) / 1000;
            if (t.endsWith("s")) return Number.parseFloat(t);
            return 0;
          })
      )
    );
    const animations = all.map((el) =>
      Math.max(
        ...getComputedStyle(el)
          .animationDuration.split(",")
          .map((v) => {
            const t = v.trim();
            if (t.endsWith("ms")) return Number.parseFloat(t) / 1000;
            if (t.endsWith("s")) return Number.parseFloat(t);
            return 0;
          })
      )
    );

    const bodyStyle = getComputedStyle(document.body);
    const bodyBg = parseRgb(bodyStyle.backgroundColor);
    const bodyFont = px(bodyStyle.fontSize);

    const largeContentBlocks = Array.from(
      document.querySelectorAll("section, article, main, header, footer, div")
    )
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width;
      })
      .filter((w) => w > 120)
      .slice(0, 400);

    const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

    return {
      headingCount: headingEls.length,
      headingSerifRatio: headingEls.length ? headingSerifCount / headingEls.length : 0,
      avgHeadingTextSize: avg(headingTextSizes),
      avgInteractiveRadius: avg(radii),
      avgInteractiveShadowBlur: avg(shadowBlur),
      maxTransitionSeconds: Math.max(0, ...transitions),
      maxAnimationSeconds: Math.max(0, ...animations),
      animatedElementRatio:
        all.length
          ? all.filter((_, i) => transitions[i] > 0 || animations[i] > 0).length / all.length
          : 0,
      avgContentBlockWidth: avg(largeContentBlocks),
      bodyFontSize: bodyFont,
      bodyBackgroundRgb: bodyBg,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });

  const idleBefore = await page.screenshot({
    path: idleBeforePath,
    fullPage: false,
    animations: "allow",
  });
  await page.waitForTimeout(1200);
  const idleAfter = await page.screenshot({
    path: idleAfterPath,
    fullPage: false,
    animations: "allow",
  });

  const pointerBefore = await page.screenshot({
    path: pointerBeforePath,
    fullPage: false,
    animations: "allow",
  });
  const points = [
    [Math.round(viewport.width * 0.15), Math.round(viewport.height * 0.22)],
    [Math.round(viewport.width * 0.8), Math.round(viewport.height * 0.18)],
    [Math.round(viewport.width * 0.7), Math.round(viewport.height * 0.7)],
    [Math.round(viewport.width * 0.25), Math.round(viewport.height * 0.62)],
    [Math.round(viewport.width * 0.55), Math.round(viewport.height * 0.4)],
  ];
  for (const [x, y] of points) {
    await page.mouse.move(x, y, { steps: 24 });
    await page.waitForTimeout(90);
  }
  const pointerAfter = await page.screenshot({
    path: pointerAfterPath,
    fullPage: false,
    animations: "allow",
  });

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(120);
  const scrollBefore = await page.screenshot({
    path: scrollBeforePath,
    fullPage: false,
    animations: "allow",
  });
  await page.evaluate(async () => {
    for (let i = 0; i < 6; i += 1) {
      window.scrollBy({ top: 240, behavior: "instant" });
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  });
  await page.waitForTimeout(300);
  const scrollAfter = await page.screenshot({
    path: scrollAfterPath,
    fullPage: false,
    animations: "allow",
  });

  await page.close();

  const heroDescriptor = computeImageDescriptor(decodePng(heroBuffer));
  const idleDiff = compareFrames(idleBefore, idleAfter);
  const pointerDiff = compareFrames(pointerBefore, pointerAfter);
  const scrollDiff = compareFrames(scrollBefore, scrollAfter);

  return {
    url,
    artifacts: {
      hero: heroShotPath,
      idleBefore: idleBeforePath,
      idleAfter: idleAfterPath,
      pointerBefore: pointerBeforePath,
      pointerAfter: pointerAfterPath,
      scrollBefore: scrollBeforePath,
      scrollAfter: scrollAfterPath,
    },
    heroDescriptor,
    motion: {
      idleDiff,
      pointerDiff,
      scrollDiff,
      idleMotionMagnitude: scoreMotionDiff(idleDiff),
      pointerMotionMagnitude: scoreMotionDiff(pointerDiff),
      scrollMotionMagnitude: scoreMotionDiff(scrollDiff),
    },
    dom: {
      ...domMetrics,
      bodyBackgroundHex: rgbToHex(domMetrics.bodyBackgroundRgb),
    },
  };
}

function getThreshold(mode, thresholdOverride) {
  if (Number.isFinite(thresholdOverride)) return thresholdOverride;
  return mode === "replica" ? 0.78 : 0.64;
}

function buildScore(ref, target, thresholdOverride, mode) {
  const threshold = getThreshold(mode, thresholdOverride);
  const screenshotScores = {
    meanLuma: similarityWithTolerance(
      target.heroDescriptor.meanLuma,
      ref.heroDescriptor.meanLuma,
      mode === "replica" ? 0.18 : 0.28
    ),
    lumaStdDev: similarityWithTolerance(
      target.heroDescriptor.lumaStdDev,
      ref.heroDescriptor.lumaStdDev,
      mode === "replica" ? 0.17 : 0.22
    ),
    meanSaturation: similarityWithTolerance(
      target.heroDescriptor.meanSaturation,
      ref.heroDescriptor.meanSaturation,
      mode === "replica" ? 0.14 : 0.2
    ),
    warmRatio: similarityWithTolerance(
      target.heroDescriptor.warmRatio,
      ref.heroDescriptor.warmRatio,
      mode === "replica" ? 0.24 : 0.8
    ),
    warmPaperRatio: similarityWithTolerance(
      target.heroDescriptor.warmPaperRatio,
      ref.heroDescriptor.warmPaperRatio,
      mode === "replica" ? 0.26 : 0.36
    ),
    edgeDensity: similarityWithTolerance(
      target.heroDescriptor.edgeDensity,
      ref.heroDescriptor.edgeDensity,
      mode === "replica" ? 0.12 : 0.18
    ),
  };
  const screenshotSimilarity =
    mode === "replica"
      ? average(Object.values(screenshotScores))
      : (
          screenshotScores.meanLuma * 0.22 +
          screenshotScores.lumaStdDev * 0.18 +
          screenshotScores.meanSaturation * 0.17 +
          screenshotScores.warmRatio * 0.08 +
          screenshotScores.warmPaperRatio * 0.2 +
          screenshotScores.edgeDensity * 0.15
        );

  const motionScores = {
    idleMotion: similarityWithTolerance(
      target.motion.idleMotionMagnitude,
      ref.motion.idleMotionMagnitude,
      0.08
    ),
    pointerMotion: similarityWithTolerance(
      target.motion.pointerMotionMagnitude,
      ref.motion.pointerMotionMagnitude,
      0.12
    ),
    scrollMotion: similarityWithTolerance(
      target.motion.scrollMotionMagnitude,
      ref.motion.scrollMotionMagnitude,
      0.22
    ),
  };
  const motionSimilarity = average(Object.values(motionScores));

  const typographyScores = {
    serifHeadings: similarityWithTolerance(
      target.dom.headingSerifRatio,
      ref.dom.headingSerifRatio,
      mode === "replica" ? 0.65 : 0.85
    ),
    headingScale: similarityWithTolerance(
      target.dom.avgHeadingTextSize,
      ref.dom.avgHeadingTextSize,
      mode === "replica" ? 20 : 30
    ),
    bodyFontSize: similarityWithTolerance(
      target.dom.bodyFontSize,
      ref.dom.bodyFontSize,
      4
    ),
  };
  const typographySimilarity = average(Object.values(typographyScores));

  const componentScores = {
    radius: similarityWithTolerance(
      target.dom.avgInteractiveRadius,
      ref.dom.avgInteractiveRadius,
      mode === "replica" ? 14 : 420
    ),
    shadowBlur: similarityWithTolerance(
      target.dom.avgInteractiveShadowBlur,
      ref.dom.avgInteractiveShadowBlur,
      18
    ),
    animatedElementRatio: similarityWithTolerance(
      target.dom.animatedElementRatio,
      ref.dom.animatedElementRatio,
      0.24
    ),
  };
  const componentSimilarity = average(Object.values(componentScores));

  const overallScore =
    mode === "replica"
      ? (
          screenshotSimilarity * 0.45 +
          motionSimilarity * 0.3 +
          typographySimilarity * 0.15 +
          componentSimilarity * 0.1
        )
      : (
          screenshotSimilarity * 0.32 +
          motionSimilarity * 0.28 +
          typographySimilarity * 0.2 +
          componentSimilarity * 0.2
        );

  const gates =
    mode === "replica"
      ? {
          screenshotSimilarityMin: 0.7,
          motionSimilarityMin: 0.55,
        }
      : {
          screenshotSimilarityMin: 0.45,
          motionSimilarityMin: 0.55,
          typographySimilarityMin: 0.4,
          componentSimilarityMin: 0.45,
        };

  const passed =
    overallScore >= threshold &&
    screenshotSimilarity >= gates.screenshotSimilarityMin &&
    motionSimilarity >= gates.motionSimilarityMin &&
    (gates.typographySimilarityMin === undefined ||
      typographySimilarity >= gates.typographySimilarityMin) &&
    (gates.componentSimilarityMin === undefined ||
      componentSimilarity >= gates.componentSimilarityMin);

  return {
    overallScore,
    passed,
    threshold,
    gates,
    dimensions: {
      screenshotSimilarity,
      motionSimilarity,
      typographySimilarity,
      componentSimilarity,
    },
    breakdown: {
      screenshotScores,
      motionScores,
      typographyScores,
      componentScores,
    },
  };
}

function buildRecommendations(ref, target, score) {
  const notes = [];

  if (score.dimensions.screenshotSimilarity < 0.72) {
    if (target.heroDescriptor.meanLuma < ref.heroDescriptor.meanLuma - 0.08) {
      notes.push("Raise overall brightness and reduce deep dark backgrounds to match Daylight's light-first tone.");
    }
    if (target.heroDescriptor.meanSaturation > ref.heroDescriptor.meanSaturation + 0.05) {
      notes.push("Lower accent saturation; Daylight's palette is restrained and softly graded.");
    }
    if (target.heroDescriptor.warmPaperRatio < ref.heroDescriptor.warmPaperRatio - 0.05) {
      notes.push("Introduce more warm off-white paper tones in large background areas.");
    }
  }

  if (score.dimensions.motionSimilarity < 0.6) {
    if (target.motion.idleMotionMagnitude < ref.motion.idleMotionMagnitude - 0.02) {
      notes.push("Add subtle ambient motion in hero surfaces; current idle state feels too static.");
    }
    if (target.motion.pointerMotionMagnitude < ref.motion.pointerMotionMagnitude - 0.03) {
      notes.push("Increase pointer-reactive cues around hero and key cards with low amplitude transforms.");
    }
    if (target.motion.scrollMotionMagnitude < ref.motion.scrollMotionMagnitude - 0.05) {
      notes.push("Strengthen scroll reveal pacing and section transitions to better match Daylight rhythm.");
    }
  }

  if (score.dimensions.typographySimilarity < 0.6) {
    if (target.dom.headingSerifRatio < ref.dom.headingSerifRatio - 0.25) {
      notes.push("Use a stronger serif voice for headline hierarchy.");
    }
    if (target.dom.avgHeadingTextSize < ref.dom.avgHeadingTextSize - 8) {
      notes.push("Scale up headline sizes and preserve generous line spacing for editorial tone.");
    }
  }

  if (score.dimensions.componentSimilarity < 0.6) {
    notes.push("Tune component radii and shadow softness; current controls do not yet feel product-editorial.");
  }

  if (!notes.length) {
    notes.push("Style alignment is strong for this heuristic pass. Focus next on page-specific craft and content polish.");
  }

  return notes;
}

function buildSummaryMarkdown(report) {
  const score = report.score;
  const status = score.passed ? "PASS" : "FAIL";
  return `# Daylight Style Evaluation

- Status: **${status}**
- Overall score: **${round(score.overallScore, 4)}**
- Threshold: **${round(score.threshold, 4)}**
- Screenshot similarity: **${round(score.dimensions.screenshotSimilarity, 4)}**
- Motion similarity: **${round(score.dimensions.motionSimilarity, 4)}**
- Typography similarity: **${round(score.dimensions.typographySimilarity, 4)}**
- Component similarity: **${round(score.dimensions.componentSimilarity, 4)}**

## Recommendations

${report.recommendations.map((line) => `- ${line}`).join("\n")}
`;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  let playwright;
  try {
    playwright = await import("playwright");
  } catch {
    console.error(
      "Missing dependency: playwright.\nRun via: npm exec --yes --package=playwright node scripts/eval-daylight-style.mjs --target <url>\nIf browser binaries are missing: npx playwright install chromium"
    );
    process.exitCode = 1;
    return;
  }

  const timestamp = nowStamp();
  const runDir = path.resolve(repoRoot, args.out, timestamp);
  await mkdir(runDir, { recursive: true });

  const browser = await playwright.chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: {
      width: args.viewportWidth,
      height: args.viewportHeight,
    },
    reducedMotion: "no-preference",
    colorScheme: "light",
  });

  try {
    const reference = await captureSiteMetrics(
      context,
      "reference",
      args.reference,
      runDir,
      {
        width: args.viewportWidth,
        height: args.viewportHeight,
      }
    );
    const target = await captureSiteMetrics(context, "target", args.target, runDir, {
      width: args.viewportWidth,
      height: args.viewportHeight,
    });

    const score = buildScore(reference, target, args.threshold, args.mode);
    const recommendations = buildRecommendations(reference, target, score);

    const report = {
      timestamp: new Date().toISOString(),
      mode: args.mode,
      referenceUrl: args.reference,
      targetUrl: args.target,
      runDir,
      score: {
        overallScore: round(score.overallScore, 6),
        threshold: round(score.threshold, 6),
        passed: score.passed,
        dimensions: Object.fromEntries(
          Object.entries(score.dimensions).map(([k, v]) => [k, round(v, 6)])
        ),
        breakdown: {
          screenshotScores: Object.fromEntries(
            Object.entries(score.breakdown.screenshotScores).map(([k, v]) => [k, round(v, 6)])
          ),
          motionScores: Object.fromEntries(
            Object.entries(score.breakdown.motionScores).map(([k, v]) => [k, round(v, 6)])
          ),
          typographyScores: Object.fromEntries(
            Object.entries(score.breakdown.typographyScores).map(([k, v]) => [k, round(v, 6)])
          ),
          componentScores: Object.fromEntries(
            Object.entries(score.breakdown.componentScores).map(([k, v]) => [k, round(v, 6)])
          ),
        },
        gates: score.gates,
      },
      reference,
      target,
      recommendations,
    };

    const reportPath = path.join(runDir, "report.json");
    const summaryPath = path.join(runDir, "summary.md");
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(summaryPath, buildSummaryMarkdown(report), "utf8");

    console.log(JSON.stringify({
      status: score.passed ? "PASS" : "FAIL",
      overallScore: round(score.overallScore, 6),
      threshold: args.threshold,
      runDir,
      reportPath,
      summaryPath,
    }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
