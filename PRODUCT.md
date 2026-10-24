# Homeward

## Purpose and audience

Homeward helps couples turn clarity about the home they want into everyday practices. It expands the creator’s home-making workbook, which explores cooking, packing, organising, family values and involving children. This first working release offers short personal lessons and an optional shared values workbook for couples.

## Intended experience

Login is currently bypassed in the interface. Opening Homeward automatically creates an isolated guest space with a 30-day HttpOnly cookie, or resumes an existing valid profile. Guests can read lessons and save personal reflections without credentials; they can explore private workbook reflections, while shared approvals still require two distinct profiles. Existing account data stays protected. Guest milestone sharing is hidden. Clearing cookies or expiry starts a fresh guest space; there is no cross-device guest recovery.

The default home is a learning dashboard with XP and three module cards: Talk without blame, Make dinner manageable, and Find what matters. Each module follows the same six-screen sequence: one small idea, a scenario quiz, a second idea, a second quiz, one personal self-rating, and an optional note. Every screen contains one thinking task. Quizzes return authored explanations and permit another choice; personal reflection accepts 1–10 or Not sure without grading.

Each newly completed step earns 10 learning XP, once per step. A first completion of a six-step module earns 60 XP. Back navigation, reloads, retries and revisits cannot duplicate credit. Learning XP is separate from the older dinner-practice XP. The dashboard shows completed modules, individual progress and Start/Continue/Revisit actions. Revisit creates a new private reflection while keeping prior records and earned XP.

Answers autosave; leaving and reopening resumes the current step, including quiz feedback. The server validates progression and awards XP atomically. Failed requests keep their retry identity and unsaved answer; stale-tab recovery can retain the current answer or show it separately when another tab moved on. There is no runtime AI or login gate.

The earlier four micro-lessons and dinner practice remain available through secondary links when the browser/profile has earlier records. Their data is untouched. The original values workbook remains available. All personal learning stays private from partners and survives new values sessions. Source attribution is available within each module; communication reflections are not a Gottman assessment or relationship diagnosis.

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
