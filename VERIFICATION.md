# Verification — 24 October 2026

## Local results

- **25 Python tests passed** against PostgreSQL 15.17, with isolated real schemas. Coverage includes independent identities, two-person membership races, private interview/export isolation, published snapshots, stale updates, caller-owned approvals, invalidation after edits, annual session history, persisted plan steps, two-person review outcomes and recovery, password/token storage, rate limiting and HTTP boundaries.
- **3 Node UI regression tests passed**: excluded share cards remain excluded after rerender/storage reload; unsaved statement wording disables approval; a review finalized/cancelled by a partner no longer leaves an invalid screen.
- JavaScript syntax checks and Python compilation passed.
- Independent code review found three UI defects. All three were repaired and covered by the regression tests above. The reviewer raised no documented-standard release blocker; splitting authentication from the session service remains a future maintainability option.

## Browser evidence

Tested in the Codex in-app browser with two fictional accounts on the real local server/database at port 8791. The journey covered separate profile creation/join/sign-in, a private reflection and confirmed meaning, editable example cards, deliberate publication, shared priorities with separate approvals, edited statement with separate approvals, illustrated meal selection, timing/roles/fallback, separately approved practice, and a saved weekly review approved by both people. Reload resumed saved planning progress and later showed the completed review.

After review fixes, browser checks confirmed that typing unsaved statement wording disables approval and shows an instruction to save; unchecking one publication card and saving another card’s edit leaves the first unchecked. Review completion/cancellation refresh recovery also has a Node regression test.

Visual captures were opened and inspected at desktop 1440×1000, phone 390×844, narrow phone 320×740 and the actual 1280×720 browser viewport. Meal selection and plan views had no horizontal overflow at the checked phone sizes. Full-page captures include the pictured meal picker, agreed plan and review approval. This is browser viewport testing, not physical-device or full assistive-technology certification.

Local evidence is in ignored `.impeccable/review/`: `desktop-meals.png`, `phone-meals.png`, `desktop-plan.png`, `small-phone-plan.png`, `phone-review.png`, `user-plan.png`.

The final mechanical Impeccable detector returned `[]`. Raster provenance scan: four rasters, zero missing.

## Design continuity

The documenter compared `DESIGN.md`, `PRODUCT.md`, the approved build scope, `public/style.css`, `public/practice.css`, sampled app/practice markup and all six captures above. The dinner flow retains paper/forest colors, Georgia headings, platform sans controls, 14 px surfaces, 8 px controls, native choices and a 680 px reading column. Green marks the primary action, selection and agreement; plan details use open rows and rules. No material visual issue was found in these captures.

`DESIGN.md` remains unchanged as the incumbent authority. Existing documentation drift is recorded rather than promoted into new rules: its stylesheet path is still `web/style.css` instead of `public/style.css`, and its phone navigation description assumes four items while the current five-item navigation occupies three rows. The incumbent document has no token frontmatter or `.impeccable/design.json` sidecar; this ordinary extension does not migrate its format or generate a new visual system.

Source sampling also found a pre-existing text check glyph in the reflection question navigation, present in `HEAD`; this is not canonized as an icon rule or repaired in this documentation pass.

## Hosted preview verification

Deployed from `feat/no-ai-workbook` to Vercel project `homeward` in `arvins-projects-318f977d`, using a dedicated Neon Free database named `homeward-preview`. Function and database are in Singapore. The owner requested public access, so the Vercel sign-in gate is disabled for Homeward. No production release or PR merge has happened.

Verified application commit: `766d49b`. Deployment: `dpl_5KvieBGbCNLMLYytKtFdjcrp3YG1`, READY. Exact tested URL: https://homeward-qc20dhlie-arvins-projects-318f977d.vercel.app. Stable branch URL: https://homeward-git-feat-no-ai-workbook-arvins-projects-318f977d.vercel.app.

- Vercel discovery rejected the factory-assigned Python handler. An explicit top-level handler class fixed discovery; the API rewrite was narrowed to the app's single-segment endpoints. The full 25-test PostgreSQL suite passed again after these deployment edits.
- Schema migration succeeded over the integration’s direct connection; pooled runtime queries succeeded. Local database configuration was preserved.
- Hosted `/api/health` returned HTTP 200 and `{"ok":true,"ai":false}`.
- Browser: created fictional Alex’s account and private reflection, then joined fictional Sam with the invite code. Sam's interview was empty and separate.
- Authenticated HTTP checks, using separate cookies per person: Secure session cookie; private interview/export isolation; reviewed publication; shared priorities; independent statement approval; plan persistence; approval invalidation after a plan edit; independent plan approval; review approval by both; refreshed review history. All passed.
- Browser reloaded Sam's profile and rendered the saved dinner plan plus completed review from the hosted database. Signed out afterward, leaving the first-run form ready for the owner.
- The deployment uses live hosted persistence, with fictional QA data only. No original workbook records or local user records were uploaded.

Evidence: ignored `.local/hosted-results.txt`, `.local/deployment-tests.txt` and `.impeccable/review/hosted-plan.png`. Hosted checks supplement the earlier local browser walkthrough; they are not a load test or public-launch readiness certification.

## Public access check

At the owner’s explicit request, Vercel Deployment Protection was disabled for this Homeward project. Fresh HTTP requests with no cookies or authorization headers returned 200 for the public page and `/api/health`, while `/api/state` returned 401 requiring a Homeward profile. The browser opened the stable branch URL to the first-run form. Screenshot: `.impeccable/review/public-homeward.png`.

## Dinner micro-skill: continuity and local verification

The autonomous dinner module extends the incumbent visual system. Source review of `public/skills.css`, `public/skills.js` and their shared styles confirms paper/forest colors, Georgia headings, native controls, flat 14 px meal surfaces and 8 px controls. Its centred 640 px task column uses 44 px desktop and 32 px phone headings, 48 px primary targets, open checklist rows and quiet footer navigation. The completion receipt respects reduced motion. All four existing meal rasters and their provenance sidecars are reused; no new rasters were introduced.

The implementing agent opened and inspected `.impeccable/review/mini/desktop-meals.png` (1440 px wide), `user-meals.png` (1280 px), `phone-meals.png` (390 px), and the phone checklist, self-check, completion and progress captures. Local browser checks covered meal choice, preparation, immediate navigation and reload preserving checks and notes, self-check completion awarding 10 XP, history, repeat practice and the workbook link. **29 PostgreSQL-backed Python tests and 6 Node UI tests passed.**

The finish review initially required correcting outdated product documentation; that correction received a final ship verdict. The single mechanical detector pass reported the intentionally retained cream palette. `DESIGN.md` remains unchanged; the previously recorded path, navigation and format drift is not repaired or canonized by this extension, and no design sidecar is introduced.

These results concern local browser viewports and reported automated checks, not physical-device or comprehensive assistive-technology testing. The hosted checks below supplement these local results; the earlier hosted evidence above covers the workbook release.


## Dinner micro-skill: hosted verification

Application commit `72a8842fc3f5749e735ae44b2dacb7f05b70ed9f`, deployment `dpl_FZXThabBzMbzAiaciW3osjU5DNw6`, READY on the existing preview project. Exact deployment: https://homeward-h4p86506j-arvins-projects-318f977d.vercel.app. The stable branch URL is unchanged. The additive skills-table migration ran on the configured Neon preview database before code deployment.

- Hosted JavaScript and CSS matched the local files exactly.
- Separate fictional Alex/Sam identities verified skill saving, fresh-login recovery, readiness, attempt/self-check completion, 10 XP, rejection of duplicate review credit, private partner/export isolation, deliberate milestone sharing and removal, and healthy no-AI API.
- Browser on Vercel selected a meal for fictional Sam, saved one readiness check, navigated away and reloaded. The same meal and checked ingredient row returned, with Ready disabled until all three checks. Browser console showed no errors or warnings.
- Additional 320 px local capture verified long custom meal wrapping without horizontal overflow. Editing a meal returns to selection; an incomplete custom name cannot advance after reload.
- Independent finish reviewer scored documentation and final navigation/readiness guards resolved, disposition ship. Existing DESIGN.md and raster provenance were preserved.

Evidence: `.local/verify-mini-hosted.py`, `.impeccable/review/mini/hosted-meals.png`, `hosted-checklist.png`, `small-phone-custom.png`. These contain fictional QA content. No production promotion or PR merge was performed.


## Guest entry without login

The interface now opens through a same-origin guest bootstrap, reusing valid existing sessions or creating a separate browser-owned space without credentials. Guest cookies are HttpOnly, SameSite=Strict, Secure on Vercel, and expire after 30 days. Existing account records remain behind their original tokens. Login/profile creation UI is not rendered; guest milestone publication is hidden.

31 PostgreSQL-backed tests and 6 Node tests passed. Added HTTP coverage checks guest creation, repeat bootstrap identity, saved skill recovery, distinct visitor isolation, cross-room reads, profile mismatch rejection, cross-origin rejection, Secure cookies, and existing-account preservation. A fresh local browser origin opened directly to meals, saved a checklist item, and recovered it after reload without signing in. The additive guest metadata migration ran on the preview database before deployment.


## Micro-lessons: local verification — 25 October 2026

The documenter compared `PRODUCT.md`, incumbent `DESIGN.md`, `public/style.css`, `public/lessons.css`, `public/lessons.js`, `lessons.py`, the surface brief and finish review. The four authored lessons preserve paper/forest colors, Georgia headings and takeaways, platform body type, native controls and open rows with fine rules. The lesson column is 688 px including padding, with 44 px desktop/32 px phone titles, 22 px reading subheads, 16 px inputs and 48 px primary targets. No new shipping rasters were introduced. `DESIGN.md` remains unchanged; its previously recorded path, navigation and format drift is not repaired or canonized. The incumbent `.impeccable/design.json` remains absent.

The implementing agent reports browser checks of mixed 1–10 and Not sure answers, optional notes, reload/resume, dated saved records, failed saves retaining answers, successful retry and completion with a blank note. No horizontal overflow was observed at 390 px. Evidence is in `.impeccable/review/lessons/`: desktop (1440 px), phone (390 px), actual user viewport (1280 px), library, reading, reflection, saved record, meal and error captures. The builder opened all eleven captures; the fresh isolated finish reviewer inspected its ten-file packet and returned **ship**, with no material fixes. The documenter additionally opened `desktop.png`, `mobile-reflection.png` and `mobile-meal-record.png`; the last visibly preserves a saved reflection with no change note. Named-agent selection was unavailable, so fresh isolated agents used the shipped reviewer/documenter contracts. The review records the narrow-extension exception from `reference/new-work.md:41`; no new visual world or concept tournament was required. The detector's only reported finding remains the intentional incumbent cream palette.

Actual output in `.local/lessons-test-results.txt` confirms **37 PostgreSQL-backed Python tests passed** (`Ran 37 tests`, `OK`) and **10 Node UI tests passed**, with zero failures. Coverage includes private snapshots, blank notes, all authored lessons, invalid/incomplete ratings, stale drafts, concurrent completion and lost-response retries, cookie/profile/export boundaries, in-flight edits, failed draft/final saves and expired-identity isolation. These are local automated and browser-viewport results, not physical-device or comprehensive assistive-technology certification. Hosted micro-lesson validation remains pending; earlier hosted evidence above applies to earlier releases.

## Micro-lessons: hosted verification

Application commit `0ab02081b86a75179dc7c1212b985dc9c3093b27` deployed READY as `dpl_9ZRgsjD7jeNFYPvE3vTUKMoYodoK` in Singapore. Exact deployment: https://homeward-zgjlzy8po-arvins-projects-318f977d.vercel.app. The existing public branch alias was updated; no production promotion or merge occurred. The additive `learning` table migration was verified on the dedicated preview database before deployment.

A fresh fictional guest API journey saved partial drafts and completed reflections for all four lessons, recovered drafts, accepted blank optional notes and Not sure, retried completion without duplication, exported four records, and confirmed isolation from another guest. A mismatched profile was rejected with 409 and a cookie-free private-state read with 401. Script: `.local/verify-lessons-hosted.py` (ignored, creates separate fictional guest spaces).

A separate fresh browser guest on the exact deployment opened directly to the lesson library, read the realistic-dinner lesson, saved ratings 5/4/Not sure with an empty note, reloaded, and reopened the matching dated record. The record showed no change planned. Browser console had no warnings or errors. Captures `hosted-meal.png` and `hosted-record.png` under `.impeccable/review/lessons/` were opened and visually verified. This verifies the hosted learning flow; it does not extend the physical-device or assistive-technology coverage described above.

## Learning dashboard and modules: local verification — 25 October 2026

The documenter compared incumbent `DESIGN.md`, `PRODUCT.md`, `README.md`, `docs/learning-patterns.md`, `public/style.css`, `public/modules.css`, sampled module markup and state transitions, `modules.py`, the integration points and `.impeccable/surfaces/public-modules-js.md`. The requested dashboard adds XP and three module cards; each module presents six sequential screens: idea, quiz, idea, quiz, personal reflection and optional note. This precisely specified extension retains the existing paper/forest world, Georgia reading headings, platform body and control text, flat 14 px card surfaces and 8 px controls. The dashboard uses three columns above 680 px and one below; the player uses a 656 px maximum column including padding, 40 px desktop/32 px phone titles, 18 px idea text and 48 px primary targets. Radio choices retain native input semantics and warm focus outlines; completion motion respects reduced motion. No new shipping rasters were introduced.

Actual logs in `.local/modules-test-results.txt` and `.local/modules-ui-results.txt` confirm **44 PostgreSQL-backed Python tests and 14 Node UI tests passed**, with zero failures. Added coverage includes all three module completions, checked quiz progression, invalid/unselected answers, draft and back-navigation recovery, atomic retries, stale requests, legacy record preservation, ungraded ratings, replay history without duplicate XP, serialized edits, failed-action recovery and expired-session isolation. The additive module data lives in the existing private learning JSON document; this slice requires no DDL migration and preserves earlier lesson records. Each new step earns 10 learning XP once, up to 60 per module and 180 across the three authored modules. Personal ratings do not affect awards, and earlier dinner-practice XP remains separate.

The implementing agent reports a complete local communication-module journey through wrong-answer feedback, a correct checked answer, reload/resume, a rating of 1, an empty optional note, 60 XP completion and the dated saved reflection. Partial dinner progress earned 20 XP, producing the captured 80 XP dashboard. Network-failure checks retained the answer and exposed retry; after restoring the server, retrying a failed module start successfully entered the values module. These are reported runtime checks; the documenter independently opened the desktop dashboard, phone reflection and phone saved-record captures, including the low rating and omitted note.

The implementing agent also verified a real two-tab conflict: one tab advanced the values quiz, and the original tab's stale answer received 409. “Reload progress & keep my answer” displayed the unsaved choice separately; “Return to saved progress” resumed the newer step. This later recovery capture is desktop-width evidence and was not part of the reviewer's twelve-capture packet.

Evidence is under `.impeccable/review/modules/`: dashboards at 1440 px, the actual 1280 px user viewport and 390 px phone width; a desktop player; and phone idea, wrong/right quiz feedback, reflection, note, completion, saved record and network-error states. The independent finish reviewer opened all twelve supplied captures and returned **ship**, with no material fixes, in `finish-review.md`. Named reviewer/documenter selection was unavailable, so fresh isolated agents followed the shipped role contracts. The surface brief records the precisely specified extension exception; no new visual world or concept tournament was required. The sole mechanical detector finding is the intentionally retained incumbent cream palette.

`DESIGN.md` remains unchanged and `.impeccable/design.json` remains absent. Pre-existing drift remains explicit: the document names `web/style.css` instead of `public/style.css`, describes four-item phone navigation while the workbook has five items, and lacks token frontmatter and a sidecar. The earlier text check glyph is not promoted into a new icon rule. This ordinary extension neither repairs those unrelated items nor canonizes them as guidance.

These results cover local automated checks and browser viewports, not physical-device or comprehensive assistive-technology testing. Hosted verification of this dashboard/module slice remains pending; earlier hosted evidence above concerns earlier releases.
