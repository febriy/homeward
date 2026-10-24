# Homeward

## Purpose and audience

Homeward helps couples turn clarity about the home they want into everyday practices. It expands the creator’s home-making workbook, which explores cooking, packing, organising, family values and involving children. This first working release offers short personal lessons and an optional shared values workbook for couples.

## Intended experience

Login is currently bypassed in the interface. Opening Homeward automatically creates an isolated guest space with a 30-day HttpOnly cookie, or resumes an existing valid profile. Guests can read lessons and save personal reflections without credentials; they can explore private workbook reflections, while shared approvals still require two distinct profiles. Existing account data stays protected. Guest milestone sharing is hidden. Clearing cookies or expiry starts a fresh guest space; there is no cross-device guest recovery.

The default home is a small library of authored micro-lessons. Each teaches a concrete idea, then offers three or four personal 1–10 reflections, a Not sure option, and an optional “Anything you want to change?” note. Saving closes the lesson and keeps a dated private snapshot. Reading without reflecting is also a complete path. There is no overall grade, diagnosis, XP award, prerequisite or required real-world task in this flow.

The first four lessons cover Gottman’s conversation patterns, one realistic dinner, the work before cooking, and familiar repeat meals. The conversation lesson credits the Gottman Institute; Homeward’s questions are original self-reflections, not a validated Gottman assessment. Meal teaching adapts the creator’s workbook. Lessons are reusable authored data, with revisioned question snapshots in saved records.

Draft answers autosave and resume after reload. Failed saves retain current answers for retry; concurrent saves are version-checked and completed attempts are idempotent. New reflections preserve earlier snapshots. Learning records remain private, including from a partner in the same room, and survive new values sessions. No AI is involved.

Earlier dinner practice records remain accessible through a secondary link for people who already started that module. Its XP and optional shared milestones remain separate from learning. The original workbook remains available through “Values workbook.”

Each person reflects privately on ordinary lived moments. Authored questions and editable examples help them express values and the feelings they want at home without requiring an abstract vocabulary. Each chooses up to three values and three feelings, deliberately shares reviewed cards, then discusses and endorses shared wording through their own account. The couple edits a statement and separately approves the saved wording.

From the shared statement, they choose one value to practise over dinner. A pictured meal picker includes an own-meal option. The plan records timing, preparation, responsibilities, an optional child’s contribution, an easier fallback and a time to review. Both people approve the plan and later agree whether to keep, adjust or set it aside. Earlier sessions, plan revisions and reviews remain available.

## Product commitments

- Browser first, usable on phones and desktop; no voice in this release.
- No runtime AI. Questions, examples and sentence starters are authored and deterministic. People decide what their words mean.
- Separate accounts and private interviews. Partners see only deliberately published cards plus shared work. Exports retain the same privacy boundary.
- Approval is individual and tied to saved wording. Changes invalidate the relevant approvals.
- Real PostgreSQL persistence. Personal learning and the earlier micro-skill autosave with version checks; the original workbook uses explicit save/continue and refresh for partner changes.
- Preserve the incumbent quiet paper, forest-green palette, Georgia reading voice and native controls. `DESIGN.md` is the visual authority.

## Scope and delivery status

The local application has passed database-backed tests and a fictional two-account browser journey through a completed weekly review. A Vercel preview now uses a dedicated Neon database and has passed hosted account, privacy, persistence and approval checks. The preview is publicly accessible at the owner’s request, while private work requires a Homeward profile. The pull request is unmerged. Production has not been released.

Account recovery, email verification, automatic reminders, payments, subscriptions, voice and broader routines/skills are outside this slice. The current private data boundary is enforced by application access controls; it is not end-to-end encryption.

See `docs/no-ai-build.md` for acceptance criteria, `README.md` for operation, and `VERIFICATION.md` for evidence and limitations.
