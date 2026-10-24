# Homeward

## Purpose and audience

Homeward helps couples turn clarity about the home they want into everyday practices. It expands the creator’s home-making workbook, which explores cooking, packing, organising, family values and involving children. This first working release serves two adults with a small personal dinner skill and an optional shared values workbook.

## Intended experience

The default home is one autonomous micro-skill: make a dependable dinner. Choose a pictured meal or name a familiar one, check ingredients/time/help, leave to try it, then return for a private confidence self-check and optional note. Readiness and reflection drafts autosave to the profile; failed saves remain in memory for retry and navigation waits for saves. Full-page departure warns while unsaved. Completed attempts earn 10 XP each, with confidence recorded separately as self-assessment. Repeating keeps history and starts a fresh checklist. Personal progress survives new workbook sessions.

Milestone sharing is deliberate. The partner sees only the person's name and “Practised a dependable dinner”; meal, notes, confidence, history and XP remain private. Sharing can be withdrawn. There is one module, no skill catalogue or avatar system yet. The original workbook remains available through “Our values workbook.”

Each person reflects privately on ordinary lived moments. Authored questions and editable examples help them express values and the feelings they want at home without requiring an abstract vocabulary. Each chooses up to three values and three feelings, deliberately shares reviewed cards, then discusses and endorses shared wording through their own account. The couple edits a statement and separately approves the saved wording.

From the shared statement, they choose one value to practise over dinner. A pictured meal picker includes an own-meal option. The plan records timing, preparation, responsibilities, an optional child’s contribution, an easier fallback and a time to review. Both people approve the plan and later agree whether to keep, adjust or set it aside. Earlier sessions, plan revisions and reviews remain available.

## Product commitments

- Browser first, usable on phones and desktop; no voice in this release.
- No runtime AI. Questions, examples and sentence starters are authored and deterministic. People decide what their words mean.
- Separate accounts and private interviews. Partners see only deliberately published cards plus shared work. Exports retain the same privacy boundary.
- Approval is individual and tied to saved wording. Changes invalidate the relevant approvals.
- Real PostgreSQL persistence. The micro-skill autosaves with version checks; the original workbook uses explicit save/continue and refresh for partner changes.
- Preserve the incumbent quiet paper, forest-green palette, Georgia reading voice and native controls. `DESIGN.md` is the visual authority.

## Scope and delivery status

The local application has passed database-backed tests and a fictional two-account browser journey through a completed weekly review. A Vercel preview now uses a dedicated Neon database and has passed hosted account, privacy, persistence and approval checks. The preview is publicly accessible at the owner’s request, while private work requires a Homeward profile. The pull request is unmerged. Production has not been released.

Account recovery, email verification, automatic reminders, payments, subscriptions, voice and broader routines/skills are outside this slice. The current private data boundary is enforced by application access controls; it is not end-to-end encryption.

See `docs/no-ai-build.md` for acceptance criteria, `README.md` for operation, and `VERIFICATION.md` for evidence and limitations.
