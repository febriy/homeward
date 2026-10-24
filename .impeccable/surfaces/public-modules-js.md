---
version: 1
slug: "public-modules-js"
primary_target: "public/modules.js"
related_targets: ["public/modules.css"]
---

# Homeward learning dashboard and step player

Mode: Operate on dashboard/player, Read on idea steps.

## THESIS
A visible learning journey for family life: choose one of three module cards, do one small thinking task per screen, see progress and earn XP. Progress means engagement with learning; personal answers are never graded.

## OWN-WORLD
Keep Homeward's paper and forest palette, Georgia headings, platform body text and adult workbook warmth. Borrow education and gaming mechanics: clear module cards, saved progress, small earned rewards, immediate quiz feedback. No new mascot or copied brand assets.

## STORY
Dashboard with learning XP and three cards → one small idea → scenario check with explanation → another idea → another check → one personal reflection → optional change note → completion and earned XP → dashboard. Back, save-and-leave, resume and prior reflections remain accessible. Old lesson and dinner records remain intact.

## FIRST VIEWPORT
At desktop, all three module cards and actual XP/progress fit together. At phone, XP and the first module are immediately visible. Each card has a title, learning outcome, six-step progress, and Start/Continue/Revisit action. The player puts one heading and one thinking task on screen with a clear next action. Signature interaction: scenario answer → useful feedback → Continue; personal reflection never has a correct answer.

## FORM
Code-led precise user request inside the existing visual world, under new-work.md's local-extension/precisely-specified-request exception. The user explicitly requests dashboard cards, XP and one small idea or quiz per page; those choices override generic card/metric warnings. No concept roll or confirmation is needed for these pinned choices. Three authored modules share one data-driven player. XP is awarded once per new completed step, persisted server-side, never multiplied by reload or retry. Replay saves another reflection without erasing history. Native radio inputs and buttons retain keyboard/touch affordances.

## FINISH
unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Required evidence: dashboard and player at 1440, 390 and actual user viewport; idea, wrong/right quiz feedback, reflection, completion, resumed progress, history and errors. No new raster assets. Preserve no-login isolated guest entry, no runtime AI, earlier private records and optional values workbook.
