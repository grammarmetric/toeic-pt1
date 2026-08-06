# TOEIC Practice Test 1

A full 200-question TOEIC practice test as one page. The questions, Part 1
photos, timing and scoring are all embedded in `index.html` (1.2 MB); the four
listening tracks sit alongside it in `audio/` and are fetched separately, so
the page is usable in a second or two instead of after a 57 MB download.

Each track is downloaded in full before it starts playing, and the parts not
yet needed download quietly in the background one at a time. Exam mode allows
one play only, so a track is never started until it is entirely in hand — a
mid-track wifi stall cannot cost a student their listening.

There is also a single-file version with the audio inlined, for offline use off
a USB stick; it lives on the teacher's Drive, not here.

Two modes are chosen on the start screen:

- **Exam mode** — audio plays once, 75-minute reading timer, auto-submit at zero.
- **Class mode** — no time limit, audio replayable, elapsed time shown.

Answers autosave to the browser, and progress can be saved to / loaded from a
JSON file to move between computers. On submit, the student downloads a results
JSON file to send to the teacher; the page itself shows the score only, never
the answer key.

Provided for the use of my own students. Not indexed by search engines
(`robots.txt` + `noindex`). Course material is reproduced under the publisher's
copyright and is not licensed for redistribution.

## Score reports

Each student gets an interactive report built from the results file they send
back. It shows their score bands, where the marks went part by part, and two
diagnostics the raw score hides: how they do on the first question of each
listening set versus the detail questions, and single- versus two-document
reading passages. It shows which questions were right and wrong but **never the
correct answers**, so the test stays reusable and the reports are safe to host.

### Making them

1. Put the students' results files in `results/` — as many as you like.
2. Run:

   ```
   node tools/make-reports.mjs
   ```

3. It prints a table of student names and URLs, and writes the same list to
   `tools/manifest.json`.
4. Publish:

   ```
   git add r && git commit -m "reports" && git push
   ```

Each report lands at `r/<16-hex>.html`. The filename is derived from the
student's name plus a local salt in `tools/.salt`, so it is unguessable, and it
is **stable** — fixing the template and re-running does not break links you have
already sent out.

To show a student a preferred name instead of the name on their results file,
add it to `tools/nicknames.json`:

```json
{ "Full Name As Typed Into The Test": "Nickname" }
```

Only the display name reaches the published report. The name on the results
file stays in `results/` and in `tools/manifest.json`, both local.

`results/`, `tools/manifest.json`, `tools/.salt` and `tools/nicknames.json` are
all gitignored. The raw results files and the name-to-URL mapping never leave
your machine.

The generator refuses a file rather than guess: wrong practice test, fewer than
200 questions, or a summary block that disagrees with the per-question data.
The Part 5 sub-type tagging and the Part 7 passage split are specific to
Practice Test 1, so a Test 2 file is rejected instead of silently mis-analysed.

### Embedding in Google Sites

**Insert → Embed → By URL**, paste the report URL, choose whole page. Set the
frame to about 900px tall; the tabs keep each panel short.

Reports follow the GrammarMetric electric design system and default to dark
mode, flipping to light if the reader's device asks for it. There is a toggle
top right. If your Site is light and you want every report to match it, change
`data-theme="dark"` to `"light"` on line 2 of `report-template.html` and
re-run the generator.

### Editing the report

`report-template.html` is the source — it holds the layout, the analysis and
the copy, with `__RESULTS_JSON__` where each student's data is injected. Edit
it and re-run the generator to rebuild every report. Do not edit files in `r/`;
they are generated output.

## Updating the test

Replace `index.html` and push. The published page updates within a minute or two.
The build sources live in
`G:\My Drive\Classroom\TOEIC\Tactics for TOEIC\_source PT1 interactive\`.
