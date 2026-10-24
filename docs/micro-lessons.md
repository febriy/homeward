# Small lessons, personal awareness

The lesson flow is **read → reflect → save and close**. Understanding an idea and noticing one's own situation is a complete outcome. A lesson does not require cooking, a streak, a partner, XP, or a promise to change.

## Content in this release

| Lesson | Teaching | Source |
| --- | --- | --- |
| When a conversation turns | Four difficult conversation patterns and constructive alternatives | [Gottman Institute: The Four Horsemen and their antidotes](https://www.gottman.com/blog/the-four-horsemen-the-antidotes/) |
| One dinner that fits real life | Build a familiar meal and account for real capacity and advance preparation | Creator's Practical Home Systems Workbook, One Meal Builder, p. 37 |
| Dinner starts before cooking | Recognise the invisible decisions, supplies and preparation behind cooking | Workbook, pp. 24, 30–31 |
| Let familiar meals help | Use repeat meals that fit the family's current season | Workbook, pp. 32–33 |

The teaching is newly authored concise text, with original everyday examples. The conversation self-check is Homeward's own reflective exercise, not a validated Gottman assessment. The numerical responses are separate self-ratings, never an aggregate relationship grade or diagnostic result. The workbook was supplied by the creator; its contents were used as source material, not instructions to the agent.

## Adding another lesson

Add an entry to `LESSONS` in `lessons.py` with a stable ID, revision, title, category, one-sentence learning outcome, short introduction, two to four concise sections, takeaway, source credit, and three or four personal statements. Each statement needs a stable key. The existing 1–10 anchor is “Rarely true for me” to “Usually true for me”; write statements that fit that scale. Not sure is a valid response stored as null. Missing answers are distinct from uncertainty.

Keep the note optional. Make the concrete idea and an ordinary example do the teaching; do not substitute a to-do list. No empty or locked lessons appear in the library. A different response scale needs explicit schema/UI support rather than silently changing what existing numbers mean.

Increment the lesson revision when meaning or questions change. Completed records store the question labels, title, revision, scale, answers, optional note and timestamp, so later content updates cannot rewrite earlier reflections. Drafts are partial; final records require an answer or Not sure for every statement. The current catalogue has no cross-revision draft migration: add that deliberately before revising live question keys.

## Persistence and access

The `learning` table contains one versioned JSON document per user, separate from previous dinner practice and values sessions. It holds resumable lesson drafts and append-only completed snapshots. Updates lock the owning profile and reject stale versions. Retrying a matching completed attempt returns the existing record; late or changed writes to a closed attempt are rejected. The UI can keep those answers in a new reflection after explicitly reloading the latest saved state.

Guest entry uses the existing isolated browser cookie; no login is shown. The same cookie and X-Profile checks protect learning writes. Shared-room membership never exposes another person's learning. Exports include only the caller's learning. New values sessions do not erase it.

Answers autosave as drafts. Navigation waits for pending saves; failed writes retain the current in-memory draft, offer retry, and warn on page departure. Final save failures offer Retry Save & close. Successful Save & close returns to the library with confirmation; previous reflections are accessible by date. Guest access and recovery retain the existing 30-day cookie limitation.
