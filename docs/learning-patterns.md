# Learning patterns for Homeward

Reviewed official sources on 25 October 2026:

- [Brilliant: classroom learning flow](https://brilliant.org/help/schools-and-educators/how-brilliant-fits-into-a-math-lesson/) describes interactive practice with feedback and explanations. Adopt one task per screen and explanatory feedback after a scenario choice.
- [Brilliant: XP](https://brilliant.org/help/features/what-is-xp/) describes XP for learning activity. Homeward uses a simpler rule: ten learning XP once per distinct step, with no score attached to a person's family self-rating.
- [DataCamp: interactive learning](https://www.datacamp.com/interactive-learning) connects browser exercises, feedback and XP. Adopt a dashboard that exposes actual module progress and one clear resume action per card.
- [Duolingo: mini-units](https://blog.duolingo.com/intermediate-mini-units/) explains shorter sequences that introduce a little material and put it to use. Adopt two small ideas interleaved with two scenario checks, followed by reflection and optional intention.

These are pattern references, not cloned interfaces or evidence that Homeward has measured learning efficacy. The user's explicit composition is the authority: a dashboard, three module cards, XP and one small thinking task per page. Homeward retains its existing visual identity and authored content. Quizzes check concepts; self-reflections capture personal awareness. Every valid self-rating, including Not sure, earns the same completion XP.

## Working implementation

`modules.py` owns three six-step sequences and validates step transitions. `public/modules.js` renders one shared player and dashboard. The existing private `learning` JSON document gains a `modules` map and a bounded list of recent operation IDs; no destructive schema migration is needed. Every module stores current cursor, answers, checked explanations, furthest progress, awarded step IDs and immutable completion snapshots. The server locks the owning profile and checks the learning version. Matching request retries return current saved state before a second award can occur.

Quiz checks must be correct before continuing. Wrong answers show an explanation and can be changed without an XP penalty. Reflection accepts any integer 1–10 or explicit uncertainty; an unchosen value cannot silently become a rating. The optional note may be empty. Each first step completion earns 10 XP. Revisits retain the award ledger and earlier snapshots; new learning is not inferred from the numeric self-rating.

The dashboard XP total counts only these learning modules. Older dinner-practice XP and earlier lesson records remain separate and accessible where present. Module privacy uses the existing guest cookie/profile/origin checks and does not add cross-household sharing. No additional AI or tracking service is introduced.
