#!/usr/bin/env node
/* ============================================================================
   Build student score reports from the results files students send in.

     node tools/make-reports.mjs

   Reads   results/*.json   (the raw file the test downloads — NEVER committed)
   Writes  r/<hash>.html    (one self-contained report per student)
   Writes  tools/manifest.json  (student -> URL, for you — NEVER committed)

   The URL hash is derived from the student's name plus a local salt, so:
     - it is stable: re-running after a template change keeps every URL alive
     - it is unguessable without tools/.salt, which never leaves this machine

   The generated reports contain NO answer key — only the per-question
   correct/incorrect flags that are already in the student's own results file.
   ========================================================================== */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IN_DIR = join(ROOT, "results");
const OUT_DIR = join(ROOT, "r");
const TEMPLATE = join(ROOT, "report-template.html");
const SALT_FILE = join(ROOT, "tools", ".salt");
const NICK_FILE = join(ROOT, "tools", "nicknames.json");
const MANIFEST = join(ROOT, "tools", "manifest.json");
const BASE_URL = "https://grammarmetric.github.io/toeic-pt1";

/* The Part 5 sub-type tagging, the Part 3/4 set boundaries and the Part 7
   single/double split inside the template are all specific to Practice Test 1.
   Refuse anything else rather than silently produce a wrong analysis. */
const SUPPORTED_TEST = "Tactics for TOEIC - Practice Test 1";

function die(msg) { console.error("\n  ERROR: " + msg + "\n"); process.exit(1); }

if (!existsSync(TEMPLATE)) die("report-template.html not found.");
if (!existsSync(IN_DIR)) {
  mkdirSync(IN_DIR, { recursive: true });
  die("Created results/ — put the students' .json files in there and re-run.");
}

/* Salt: created once, never committed. Losing it changes everyone's URL. */
let salt;
if (existsSync(SALT_FILE)) salt = readFileSync(SALT_FILE, "utf8").trim();
else {
  salt = randomBytes(24).toString("hex");
  writeFileSync(SALT_FILE, salt + "\n");
  console.log("  Created tools/.salt — keep it. Deleting it changes every report URL.");
}

const nicknames = existsSync(NICK_FILE) ? JSON.parse(readFileSync(NICK_FILE, "utf8")) : {};
const template = readFileSync(TEMPLATE, "utf8");
if (!template.includes("__RESULTS_JSON__")) die("Template has no __RESULTS_JSON__ placeholder.");

const files = readdirSync(IN_DIR).filter(f => f.toLowerCase().endsWith(".json"));
if (!files.length) die("No .json files in results/.");

mkdirSync(OUT_DIR, { recursive: true });

const rows = [];
const seen = new Map();

for (const file of files) {
  let raw;
  try { raw = JSON.parse(readFileSync(join(IN_DIR, file), "utf8")); }
  catch (e) { console.error(`  SKIP ${file} — not valid JSON (${e.message})`); continue; }

  const who = raw?.student?.name;
  if (!who) { console.error(`  SKIP ${file} — no student.name`); continue; }
  if (raw.test !== SUPPORTED_TEST) {
    console.error(`  SKIP ${file} — test is "${raw.test}", this template only covers "${SUPPORTED_TEST}"`);
    continue;
  }
  if (!Array.isArray(raw.perQuestion) || raw.perQuestion.length !== 200) {
    console.error(`  SKIP ${file} — expected 200 perQuestion entries, found ${raw.perQuestion?.length}`);
    continue;
  }

  /* Compact the per-question data to [q, part, flag] where
     flag: 1 correct, 0 incorrect, -1 not answered. This is the only
     student data that reaches the published file. */
  const perQuestion = raw.perQuestion
    .slice()
    .sort((a, b) => a.q - b.q)
    .map(r => [r.q, r.part, r.answer === null || r.answer === undefined ? -1 : (r.correct ? 1 : 0)]);

  /* Cross-check the compacted data against the file's own summary, so a
     malformed or hand-edited results file cannot produce a plausible-looking
     but wrong report. */
  const correctIn = r0 => perQuestion.filter(x => x[1] === r0 && x[2] === 1).length;
  const summary = raw.summary || {};
  const problems = [];
  for (const [part, s] of Object.entries(summary.perPart || {})) {
    const got = correctIn(part);
    if (got !== s.correct) problems.push(`${part}: counted ${got}, file says ${s.correct}`);
  }
  const lr = perQuestion.filter(x => x[0] <= 100 && x[2] === 1).length;
  const rr = perQuestion.filter(x => x[0] > 100 && x[2] === 1).length;
  if (summary.listeningRaw !== undefined && lr !== summary.listeningRaw)
    problems.push(`listening: counted ${lr}, file says ${summary.listeningRaw}`);
  if (summary.readingRaw !== undefined && rr !== summary.readingRaw)
    problems.push(`reading: counted ${rr}, file says ${summary.readingRaw}`);
  if (problems.length) { console.error(`  SKIP ${file} — inconsistent:\n      ${problems.join("\n      ")}`); continue; }

  const displayName = raw.displayName || nicknames[who] || who.split(/\s+/)[0];

  /* Stable, unguessable filename. Keyed on the person, not the file contents,
     so regenerating after a template fix does not orphan a link already sent. */
  const hash = createHash("sha256").update(salt + "|" + SUPPORTED_TEST + "|" + who).digest("hex").slice(0, 16);
  if (seen.has(hash)) {
    console.error(`  SKIP ${file} — "${who}" already generated from ${seen.get(hash)}`);
    continue;
  }
  seen.set(hash, file);

  /* Only the display name is published. The report greets the student by the
     name they are called; shipping their full name as typed on the results
     file would put more identity on a public URL than the page ever shows. */
  const payload = {
    test: raw.test,
    student: { class: raw.student.class ?? "" },
    displayName,
    mode: raw.mode ?? "exam",
    startedAt: raw.startedAt ?? null,
    submittedAt: raw.submittedAt ?? null,
    readingSecondsUsed: raw.readingSecondsUsed ?? 0,
    summary: {
      listeningRaw: lr, readingRaw: rr,
      listeningScaled: summary.listeningScaled ?? "", readingScaled: summary.readingScaled ?? "",
      totalEstimate: summary.totalEstimate ?? "", perPart: summary.perPart ?? {}
    },
    perQuestion
  };

  const html = template.replace("__RESULTS_JSON__", JSON.stringify(payload));
  if (html.includes("__RESULTS_JSON__")) die("placeholder survived substitution");

  const out = hash + ".html";
  writeFileSync(join(OUT_DIR, out), html);
  rows.push({ student: who, shown: displayName, class: payload.student.class,
              mode: payload.mode, score: summary.totalEstimate ?? "",
              file: out, url: `${BASE_URL}/r/${out}` });
}

/* A directory with no index would 404 on Pages anyway; this makes sure of it. */
writeFileSync(join(OUT_DIR, "index.html"),
`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
<title>Not found</title></head><body><p>Nothing here.</p></body></html>\n`);

writeFileSync(MANIFEST, JSON.stringify({ generated: new Date().toISOString(), reports: rows }, null, 2));

if (!rows.length) die("No reports generated.");
console.log(`\n  ${rows.length} report${rows.length === 1 ? "" : "s"} written to r/\n`);
const w = Math.max(...rows.map(r => r.student.length), 7);
console.log("  " + "Student".padEnd(w) + "  Class  Mode   Est.      URL");
console.log("  " + "-".repeat(w) + "  -----  -----  --------  ---");
for (const r of rows)
  console.log("  " + r.student.padEnd(w) + "  " + String(r.class).padEnd(5) + "  " +
              r.mode.padEnd(5) + "  " + String(r.score).padEnd(8) + "  " + r.url);
console.log("\n  Links are also in tools/manifest.json (not published).");
console.log("  Publish with:  git add r && git commit -m \"reports\" && git push\n");
