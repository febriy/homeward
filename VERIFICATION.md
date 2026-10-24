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

## Pending hosted verification

No hosted deployment, managed database or Vercel runtime check has been completed. Account identity is readable, but the connector’s team-scoped request returned HTTP 403 for missing team access. The owner’s grant is required before provisioning and hosted testing. Local success must not be described as a successful Vercel deployment.
