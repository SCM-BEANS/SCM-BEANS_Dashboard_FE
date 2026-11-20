# Dolores interface redesign

## Design read

Redesign the existing coffee-machine management product for daily operational use. Preserve routes, permissions, field meanings and APIs. Use a calm, restrained light interface with one muted blue accent. The landing page uses the existing product footage rather than invented photography or a simulated dashboard.

DESIGN_VARIANCE: 4. MOTION_INTENSITY: 1. VISUAL_DENSITY: 6.

## Audit and decisions

- Independent landing and app palettes caused drift. `public/dolores-theme.css` now owns shared colors, font and shape tokens; the app imports it and the standalone landing links it.
- Large near-white surfaces and saturated violet competed for attention. Separate canvas, panel, control and selected-state surfaces; reserve accent for actions and selection.
- Tables and forms varied between roles. Keep the existing component system; standardize table spacing, keyboard focus, empty rows, input surfaces and button sizes without introducing another component library.
- Preserve semantic colors for failure, warning and success. A notification category is not an error state.
- Reduce nested panel outlines in profiles and billing filters. Use spacing and subtle section backgrounds to group related content.
- Keep the sidebar at 240px to match the existing action dock, with 44px navigation targets. All four role shells use the same header separator, body rhythm and controls.
- Keep the existing product video and controls. Separate landing text and media on desktop; explicitly stack at mobile widths. Remove the decorative fake dashboard from login.

## Interaction rules

- Controls: 8px radius; panels: 12px radius. Text labels remain visible and buttons retain stable size.
- Inputs have labels, visible focus and distinct disabled surfaces. Existing validation and submission behavior are preserved.
- Table containers can receive keyboard focus to scroll horizontally. Focus within a row highlights its context; empty tables have a centered message.
- Decorative motion is disabled. Progress and loading feedback remain functional. Existing reduced-motion alternatives remain in place.
- No changes to production data or backend contracts are part of this redesign.

## Validation scope

Use isolated local preview and mocked reads for screenshots. Check desktop and mobile overflow, keyboard table access, login states and role-specific shells. Run TypeScript, targeted lint, contrast assertions and diff whitespace checks. Visual examples use fixtures rather than live financial data.

## Recorded results

- TypeScript, targeted ESLint and diff whitespace checks passed.
- Admin, Moderator, Technician and Owner notification screens passed viewport overflow checks at 1440, 768 and 390px; shared accent resolved to the same token in each role.
- Contract table focus and horizontal scrolling with ArrowRight passed on mobile.
- Standalone landing resolved the same shared accent and passed the same viewport checks.
- Primary button contrast: 6.30:1; body text: 10.94:1; secondary text on canvas: 5.03:1; active selection: 4.94:1.
- Local landing Lighthouse: Accessibility 100, Best Practices 100. This is not a production performance assessment.
- Screenshots use mocked API reads; no live workflow mutations were made. Every business workflow has not been exercised end to end.
