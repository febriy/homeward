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

These results concern local browser viewports and reported automated checks, not physical-device or comprehensive assistive-technology testing. Hosted verification of this micro-skill is pending; the earlier hosted evidence above covers the workbook release.
