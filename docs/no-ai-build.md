# First working Homeward release

Approved direction: the user asked for a working version without AI, supplied `febriy/homeward`, and said “ok go” on 24 October 2026.

## Observable outcome

Two partners have independent accounts. Each can save and return to private reflection, choose up to three values and three desired feelings from editable examples or their own words, and share only reviewed cards. They discuss and separately endorse shared priorities, complete an editable statement template, and each approve the exact wording. From that statement they create one dinner practice with a pictured meal or their own meal, timing, responsibilities, fallback and review date. Each approves the plan. Review records and prior plan revisions remain saved.

## Implementation boundary

Preserve the reviewed paper/forest/Georgia interface and meal illustrations. Use the Homeward name. Carry over useful Python session logic and buildless browser UI from the local pilot, removing model calls and simulated approvals. Use PostgreSQL for real persistence, locally for development and a dedicated managed database for hosting. Serve through Vercel Python functions with static assets. No model, payments, voice, notifications or subscriptions in this slice. Do not copy user records, credentials, local model files or the workbook PDF into Git.

## Acceptance and checks

Test against real PostgreSQL: account/session authentication, two-person membership, private answer and export isolation, reviewed publication snapshots, stale-update rejection, caller-owned approvals, invalidation after edits, new annual session preservation, saved practice steps, review history, rate limiting and HTTP origin/cookie protections. Test the full browser journey with fictional accounts, including reload and separate partner approval; inspect desktop and narrow-phone layouts. Check that no model endpoint or external AI dependency is present. Keep hosted verification separate from local evidence.

## Deployment

Target repository: https://github.com/febriy/homeward (initially empty/public). Target Vercel team returned by the account: `team_M4iJwTyS8ArbIEjukm4OZQ7X` (`arvins-projects-318f977d`). The owner granted connector team access; a protected preview is deployed with a dedicated Neon database. No paid plan or database upgrade is authorized. The hosted path has been verified; see VERIFICATION.md. Production remains outside the completed preview release. Source review is via a feature branch and pull request; no automatic PR merge.
