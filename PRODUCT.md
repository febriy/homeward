# Homeward

## Purpose and audience

Homeward helps couples turn clarity about the home they want into everyday practices. It expands the creator’s home-making workbook, which explores cooking, packing, organising, family values and involving children. This first working release focuses on two adults and one dinner practice.

## Intended experience

Each person reflects privately on ordinary lived moments. Authored questions and editable examples help them express values and the feelings they want at home without requiring an abstract vocabulary. Each chooses up to three values and three feelings, deliberately shares reviewed cards, then discusses and endorses shared wording through their own account. The couple edits a statement and separately approves the saved wording.

From the shared statement, they choose one value to practise over dinner. A pictured meal picker includes an own-meal option. The plan records timing, preparation, responsibilities, an optional child’s contribution, an easier fallback and a time to review. Both people approve the plan and later agree whether to keep, adjust or set it aside. Earlier sessions, plan revisions and reviews remain available.

## Product commitments

- Browser first, usable on phones and desktop; no voice in this release.
- No runtime AI. Questions, examples and sentence starters are authored and deterministic. People decide what their words mean.
- Separate accounts and private interviews. Partners see only deliberately published cards plus shared work. Exports retain the same privacy boundary.
- Approval is individual and tied to saved wording. Changes invalidate the relevant approvals.
- Real PostgreSQL persistence, with explicit save/continue actions and refresh for a partner’s latest work.
- Preserve the incumbent quiet paper, forest-green palette, Georgia reading voice and native controls. `DESIGN.md` is the visual authority.

## Scope and delivery status

The local application has passed database-backed tests and a fictional two-account browser journey through a completed weekly review. A Vercel preview now uses a dedicated Neon database and has passed hosted account, privacy, persistence and approval checks. Deployment Protection remains enabled, and the pull request is unmerged. Production has not been released.

Account recovery, email verification, automatic reminders, payments, subscriptions, voice and broader routines/skills are outside this slice. The current private data boundary is enforced by application access controls; it is not end-to-end encryption.

See `docs/no-ai-build.md` for acceptance criteria, `README.md` for operation, and `VERIFICATION.md` for evidence and limitations.
