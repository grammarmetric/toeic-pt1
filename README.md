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

## Updating

Replace `index.html` and push. The published page updates within a minute or two.
The build sources live in
`G:\My Drive\Classroom\TOEIC\Tactics for TOEIC\_source PT1 interactive\`.
