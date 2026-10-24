# Our values — interface conventions

Refined with the Impeccable skill on 24 October 2026. The incumbent paper, forest-green palette, serif reading voice and paired-leaf wordmark remain the visual authority. This pass improves an existing workbook-like tool rather than replacing its identity.

## Hierarchy and rhythm

The participant's task comes first. Headings lead; private/shared context appears underneath in ordinary sentence case. Question text precedes the interview topic and number. Card titles precede category and selection metadata. Overview stages use open columns instead of a second layer of boxed cards.

Use fixed rem type sizes: 16 px body and inputs, 14 px primary controls, 13 px labels, 12–13 px supporting metadata. Georgia remains the reading face for headings, reflections and statements; the platform sans carries controls. Desktop task headings are 36–44 px; the welcome heading is 56 px. Phone question text is 24 px, with a 30 px interview introduction.

Spacing groups related content at 8–16 px, components at 20–28 px and sections at 32–48 px. Reading passages stay bounded rather than filling wide screens.

## Tokens and controls

`web/style.css` owns semantic variables for paper, surface, sidebar, ink, muted text, lines, controls, green, hover, sage, selected, focus and error. Cards use a 14 px radius; controls use 8 px. There is no layered shadow under bordered cards.

Green identifies the main action or agreed state. A selected personal card offers a quieter outline removal button; choosing an unselected card gets the stronger action. Reflections use a pale inset surface, distinct from the person's saved answer. SVG arrows/checks share a 1.7 px stroke; hidden approval text preserves each person's screen-reader status.

Interactive buttons have 44 px minimum targets; primary controls are at least 46 px. Input text stays at 16 px on phones. Focus uses a 3 px warm outline. Placeholders and secondary text meet 4.5:1 against their intended surfaces. Forms retain native controls, browser selection, caret and scrollbar behavior with palette colors. Reduced motion disables color transitions and smooth route scrolling.

## Layout and access

Above 680 px, the header and sidebar remain available while the work scrolls. The sidebar can scroll when its tools exceed the viewport. At tablet widths, dense card comparisons become a single column. At phone widths, navigation becomes a two-by-two grid, saved-session tools move below the content, and the wordmark button returns to the overview.

The first-run form pairs first name and username on wide screens and stacks them at narrower sizes. Every route has a main-content anchor for keyboard skipping. Current steps, pressed profile actions, interview question names and the editor title are exposed programmatically. Preserve participant wording, privacy boundaries and approval behavior when refining appearance.

## Verification and intentional exception

The one requested mechanical Impeccable scan reported only `cream-palette`. The cream background is intentionally retained from the existing interface, consistent with the user's sold workbook and the scope of refinement. It is not a new generic palette or a reason to replace the established visual world. No detector rule was disabled.

See `VERIFICATION.md` for actual browser sizes, interaction evidence and the limits of device testing.
