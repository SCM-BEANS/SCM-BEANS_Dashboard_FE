# Shared confirmation dialogs across roles

**Status:** Phase 1 implementation is in place; verification status is **unverified**. Phases 2–3 have not started.
**Target workspace:** C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE
**Plan path:** C:\GitHub\BEANS\SCM-BEANS_Dashboard_FE\plans\shared-notification-dialogs.md
**Lifecycle/domain:** s-plan + frontend/fe-architecture, frontend/fe-ui, frontend/fe-quality.

## 1. Confirmed direction and acceptance contract

The user clarified that the reusable dialog is only the confirmation prompt shown in the screenshot, not success or failure messages. `DoloresDialog` defines the shared confirmation form; a separate role-specific file exports a named function/component for each concrete confirmation (for example, disabling an account). Screens call the specific confirmation component while keeping their own state and callbacks. This confirmation-only scope applies across Admin, Moderator, Technician, and customer screens.

The attached screenshot is the visual reference: centered white rounded dialog, dimmed page backdrop, short muted eyebrow, dark title and body, then full-width vertically stacked primary and secondary actions. The user previously asked for the reissue-password confirmation text to be black; the shared title and body must use an explicit dark text color so inherited or utility styles cannot make them disappear.

| ID | Acceptance requirement |
| --- | --- |
| R1 | Add reusable `DoloresDialog` structure under `src/app/_ui/dolores` and named feature-specific dialog components in a separate configuration file; pages call the concrete dialog component directly instead of building generic config objects or defining presentation inline. Do not add a global provider or generic group/registry. |
| R2 | Keep each screen's current state machine, validation, mutation callbacks, pending/disabled conditions, navigation targets, and close behavior with that screen. Feature-specific dialog configuration components own their display copy, content, and action layout, and receive state/data/callbacks from the screen without owning workflow transitions. |
| R3 | Match the screenshot's visual structure for confirmation prompts only: dim backdrop, white rounded panel, muted eyebrow, title and message in dark text, and full-width stacked actions. |
| R4 | Migrate existing user confirmation prompts in the four named role areas to named, action-specific components. Leave success/failure dialogs and inline notices outside this mechanism, as well as unrelated selection, preview, filter, or focus overlays. |
| R5 | Preserve Admin account confirmation copy, pending state, and callback behavior, including the reissue-password warning. Do not make an extra request or change account success/password visibility behavior. |
| R6 | Preserve keyboard and accessibility behavior: dialog title/description associations, modal semantics, focus entry and restoration, and each flow's established Escape/cancel policy. |
| R7 | Do not change routes, API contracts, authorization, backend behavior, dependencies, persistence, deployment configuration, or unrelated dirty working-tree files. |
| R8 | Verify lint and production build, then manually exercise representative confirmation paths from every role and compare the shared surface with the screenshot. |

The conversation is the approved product specification for this work. No separate project-specific `PROJECT_CONTEXT` file was found or supplied after it was requested; this plan therefore uses the repository's `GLOBAL_WORKING_CONTEXT.md` and `rules.md`, plus the inspected source and the choices confirmed in chat.

## 2. Inspected workspace and constraints

- The target is a Next.js 16.2.9 / React 19.2.7 / strict TypeScript / Tailwind 3.4 application. The alias `@/*` resolves under `src/*`.
- `package.json` provides `npm run lint` and `npm run build`, but no dedicated test script. Existing node tests are not dialog-focused. Do not add a test framework for this presentation change.
- Shared Dolores UI currently lives in `src/app/_ui/dolores/DoloresUI.tsx`; it exports `DoloresButton`, `DoloresNotice`, and other primitives. A dedicated `DoloresDialog.tsx` keeps this new behavior isolated and discoverable alongside that UI.
- Current in-scope confirmation prompts are:
  - Admin account create/update/disable/reactivate/reissue confirmations in `src/app/(admin)/admin/_components/AdminAccountScreens.tsx`.
  - Admin store create confirmation in `src/app/(admin)/admin/_components/AdminStoreCreateScreen.tsx`.
  - Admin Global Recipe publish confirmation in `src/app/(admin)/admin/_components/AdminMenuScreens.tsx`; this uses a native dialog today and explicitly focuses the “Quay lại” action.
-  - Moderator decision confirmations in `src/app/(moderator)/moderator/_components/ModeratorDashboardScreens.tsx`.
-  - Technician task confirmations in `src/app/(technician)/technician/_components/TechnicianDashboardScreens.tsx`.
-  - Customer confirmation panels and confirm branches of customer flows/contract expiry in `src/app/(dashboard)/dashboard/_components/CustomerDashboardScreens.tsx`.
- Keep the following separate: inline `DoloresNotice` / `role=status` / `role=alert` content; the Admin report date-range form dialog; Technician task-type selection; customer document preview; Admin machine focus view; shell mobile navigation/action menus; and full-screen model viewer. These have different purposes or interaction models.
- The repository has existing in-progress changes in the account screen/schema from prior requested work and a modified `.env`. Implementation must preserve them; never print, edit, stage, or include environment values in a diff. Recheck the working tree before implementation and review only task-owned changes.
- This is a client-side presentation refactor. No service, API, data schema, storage, or hosting changes are expected. The production build remains the deployment check.

### Proposed component boundary

Create `src/app/_ui/dolores/DoloresDialog.tsx` as the shared structure for confirmation prompts only. Its interface should provide:

- `open` and an `onRequestClose` callback, while each screen continues to own the state that supplies `open`.
- `eyebrow`, `title`, optional `description`, optional rich `children`, and `actions`; feature-specific configuration components use these slots to define each concrete dialog.
- Optional focus target and Escape policy to preserve the existing Admin publish dialog behavior and each screen's cancel rules.
- One consistent accessible modal surface with generated title/description IDs, screenshot-aligned dimensions, explicit dark title/body colors, and a stacked action region that makes supplied buttons full width.
- No business-specific variants or callbacks for create, publish, disable, reissue, or customer workflows. Do not centralize copy or derive workflow transitions inside the component.

Feature-specific confirmation components live in a dedicated configuration module separate from the page, with a named component/function for each concrete action (for example, account disable confirmation). They define that action's copy and buttons using `DoloresDialog`, while receiving `open`, dynamic display data, and callbacks as props. Pages call the action-specific component directly; do not add a generic `dialogs` record, intermediate props object, group, provider, or imperative state owner. Keep the state machine and callback implementations in the screen. Success and failure messages stay outside this mechanism.

Use the native `<dialog>` element in the shared component so modal and focus behavior have one implementation. Keep it controlled: opening invokes `showModal()`; closing follows the caller's state and closes the element; cancel requests return to the caller rather than silently changing workflow state. For each migrated flow, explicitly map the current close/Escape behavior and preserve custom initial focus, especially Admin Recipe publish. Avoid nesting a new dialog inside an existing native dialog.

## 3. Candidate paths and decision record

| Path | Fit and tradeoffs | Decision |
| --- | --- | --- |
| A. Shared controlled UI component plus named concrete dialog components; screen-owned state/callbacks | Matches the clarified direction: the base owns presentation structure, a separate role feature file declares each dialog's content/actions, and the screen calls the concrete component with open state, dynamic values, and callbacks. No generic config object layer. | **Selected by user** |
| B. Global DialogProvider that owns state and transitions | Could shorten call sites, but moves workflow state and actions away from their owning screens; adds provider lifecycle and coupling for flows with different mutation and sensitive-content needs. | Rejected by user selection |
| C. Keep separate role components and only copy screenshot styles into each confirmation | Lowest initial effort, but duplicates structure and lets text, action layout, and accessibility drift again. Does not meet the requested reusable component. | Rejected |
| D. Convert success/failure messages, inline notices, and specialized overlays too | Broadens the task beyond the confirmation shown in the screenshot and risks changing unrelated interactions. | Out of scope |

No new dependency, route, state service, API, persistence format, auth behavior, environment setting, or deployment change is required. Recovery is a scoped source revert of the new component and migration commits; do not use a broad reset because the working tree contains unrelated prior changes.

## 4. Target structure and behavior boundaries

Target ownership:

    src/app/_ui/dolores/
      DoloresDialog.tsx               shared modal structure, styling, and semantics
      DoloresUI.tsx                   existing buttons, notices, fields, and panels

    src/app/(admin)/admin/_components/
      AdminConfirmationDialogs.tsx    named Admin confirmation functions/components
      AdminAccountScreens.tsx         account state, dynamic dialog data, mutation callbacks
      AdminStoreCreateScreen.tsx      store state, dynamic dialog data, callbacks
      AdminMenuScreens.tsx            recipe confirmation state, publish callback

    src/app/(moderator)/moderator/_components/
      ModeratorDashboardScreens.tsx   decision/success state and callbacks

    src/app/(technician)/technician/_components/
      TechnicianDashboardScreens.tsx  task state and callbacks

    src/app/(dashboard)/dashboard/_components/
      CustomerDashboardScreens.tsx    customer flow state and callbacks

Dependency direction: role screens import their named, feature-specific dialog configuration component and provide current state, display data, and callbacks. Feature-specific dialog configuration components import the shared `DoloresDialog` and define concrete copy/content/actions. `DoloresDialog` may import React types and client-side React hooks, but must not import role screens, routes, API clients, providers, or workflow-specific stores.

Behavior constraints:

1. The shared component does not own a second copy of overlay state. Callers decide whether the dialog is open and what closing means.
2. Message text, action labels/order, route links, and dialog content are defined in the feature-specific configuration component. The owning screen provides dynamic values and implements every callback; the shared component only renders the configured presentation.
3. Async actions retain existing disabled/loading states; dismissing a pending request remains governed by the owning screen.
4. Success and failure presentations, including account temporary-credential details, remain owned by their existing screen flows and stay outside this confirmation-dialog mechanism. No sensitive value is added to logs or storage.
5. Use unique accessible label/description IDs per mounted instance. Preserve initial focus and close restoration; preserve each dialog's existing Escape behavior by explicit caller configuration.
6. Do not replace inline notices with blocking dialogs. Their role is page-level status or API feedback, not an action-required modal.

## 5. Phase sequence and requirement trace

The phases are sequential because role migrations depend on the shared component and its verified semantics.

| Requirement | Phase | Evidence |
| --- | --- | --- |
| R1, R3, R6 | 1 | Shared component contract and Admin screenshot/keyboard checks |
| R2, R5, R7 | 1, 2, 3 | Review each role's local state/callbacks and confirm no API or data contract changes |
| R4 | 1, 2, 3 | Exhaustive source search and manual coverage matrix across Admin, Moderator, Technician, customer |
| R8 | 1, 2, 3 | `npm run lint`, `npm run build`, and flow-based browser verification |

### Phase 1 — Shared component and Admin migration

- **Outcome:** A shared accessible dialog surface exists and all in-scope Admin confirmation prompts use it.
- **Entry/dependencies:** User authorizes implementation from this plan. Recheck the current diff and retain the pre-existing account/schema and environment-file changes unchanged.
- **Scope:** Add the shared confirmation structure and `AdminConfirmationDialogs.tsx` with named components for Admin account create/update/disable/reactivate/reissue, store create, and Global Recipe publish confirmations. Pages call the action-specific components with screen-owned open state/data/callbacks. Keep account/store success and failure behavior outside the new mechanism. Preserve account API requests, mutation guards, pending labels/disabled actions, temporary password lifecycle, and publish impact wording.
- **Non-scope:** Admin report date-range filter dialog, inline API notices, machine focus view, API/schema changes, and styling outside these dialogs.
- **Affected components and side effects:** One shared UI file, one Admin confirmation-configuration file, and three Admin screen files; imports and confirmation modal DOM structure change. No external writes, API calls, route changes, or persisted-state changes.
- **Verification and acceptance:** Confirm each Admin confirmation title/body are dark and actions are stacked/full width; exercise account create/update/disable/reactivate/reissue confirmations, store create confirmation, and recipe publish confirmation. Verify pages call named action-specific components with screen-owned open state/callbacks and no intermediate config record; pending actions cannot be double-submitted; the publish confirmation still focuses “Quay lại” initially; and success/failure flows retain their prior behavior. Run lint and build against the current working tree and classify unrelated baseline failures.
- **Exit gate:** Admin confirmation prompts are fully migrated; a search shows no remaining in-scope Admin confirmation markup. Review shared API, generated ARIA IDs, native dialog open/close synchronization, and the exact diff before Phase 2.
- **Risks and stop conditions:** Stop if native dialog lifecycle behaves differently under Next client rendering/Strict Mode, if reissue success content can be lost or exposed differently, or if focus/cancel behavior cannot be preserved. Do not “fix” unrelated account or environment-file changes during this phase.

### Phase 1 execution record — 2026-10-23

- **Status:** `unverified`; source review and available checks passed, but production build prerender and the full Admin confirmation matrix are incomplete. Phase 2 has not started.
- **Changed areas:** Added shared `DoloresDialog` in `src/app/_ui/dolores/DoloresDialog.tsx` and named Admin confirmation components in `src/app/(admin)/admin/_components/AdminConfirmationDialogs.tsx`. `AdminAccountScreens.tsx`, `AdminStoreCreateScreen.tsx`, and `AdminMenuScreens.tsx` call concrete confirmation components directly. Account/store success and failure presentations remain outside this mechanism. No directory was added.
- **Passed checks:** `npm run lint` (0 errors, 5 pre-existing warnings in unrelated Digital Twin and MFA files), `npx tsc --noEmit`, and `git diff --check`. Read-only review found no code findings in the shared dialog or Admin call sites. The available frontend review guidance (`fe-architecture`, `fe-ui`, `fe-quality`, `fe-verify`) was applied.
- **Production build:** With network access, `npm run build` compiled successfully and passed its TypeScript stage, then failed while prerendering `/model` because Windows returned `EPERM` creating `.next/server/app/model.segments/!KGRhc2hib2FyZCk`. Granting write access to `.next` did not resolve it; another run failed on `/admin/notifications` with the same class of `EPERM`. The build gate remains incomplete due to the local output-directory restriction.
- **Manual verification:** On Edge at `http://localhost:3000` (default browser viewport, local app session), opened the account-disable and temporary-password-reissue confirmation prompts, inspected the accessibility tree and screenshot, then closed each without activating its confirm action. Both showed dark title/body text, full-width vertically stacked actions, and the expected copy. No mutation was submitted. Create, update, reactivate, store-create, and recipe-publish prompts, Escape behavior, and responsive breakpoints were not manually exercised in this pass.
- **Review gaps and next gate:** Full visual/keyboard coverage and a production build that can finish prerender are still required. Resolve the `.next` `EPERM` in an environment that permits Next.js route-output creation, complete the remaining safe Admin prompt checks without submitting mutations, then reassess Phase 1 before Phase 2.

### Phase 2 — Moderator and Technician migration

- **Outcome:** Moderator and Technician confirmation prompts use named action-specific components while their workflows remain local; success/failure messages remain outside this mechanism.
- **Entry/dependencies:** Phase 1 accepted; shared component is stable and Admin verification passes.
- **Scope:** Add named role-specific confirmation components for Moderator and Technician, then migrate their confirmation branches to call those components directly. Leave success/failure branches as they are. Preserve all local writes, conditional Technician form values, navigation, cancel labels, and action ordering.
- **Non-scope:** Technician task-type chooser; inline notices, API loading/errors, and notification list pages; changes to demo data or operational workflows.
- **Affected components and side effects:** Moderator and Technician screen files plus their role-specific dialog configuration file(s); visual output and modal semantics change consistently, but no persistence key or callback changes.
- **Verification and acceptance:** Exercise one Moderator confirm → success path, one Moderator guarded path, one Technician confirm → success path, and Technician success navigation. Test Escape and focus behavior according to the existing flow configuration. Confirm the task-type chooser and inline notices remain unchanged. Run lint and build.
- **Exit gate:** No in-scope dialog wrapper remains in either role screen; local callback/state ownership is evident in the diff. Review that no confirmation callback moved into shared UI before Phase 3.
- **Risks and stop conditions:** Stop if success navigation, guarded submission, or a Technician field summary changes. Keep a divergent flow local if its interaction is not a notification dialog; do not broaden the shared component to absorb it.

### Phase 3 — Customer migration and cross-role acceptance

- **Outcome:** All in-scope customer confirmation prompts use the shared component and the full four-role acceptance matrix passes; customer success/failure messages remain unchanged.
- **Entry/dependencies:** Phases 1 and 2 accepted.
- **Scope:** Add named customer-specific confirmation components and migrate confirmation steps in `ConfirmPanel`, customer flows, and contract expiry. Leave success/error branches unchanged. Preserve flow-specific copy, validation errors, close behavior, navigation, and customer-side demo state updates.
- **Non-scope:** Customer document preview and any non-notification picker/selector; inline `DoloresNotice` content, business flow changes, routes, and account or API behavior.
- **Affected components and side effects:** Customer screen imports/markup and shared component usage. No backend/network writes or changed local storage semantics.
- **Verification and acceptance:** Exercise customer confirmation steps for buyback, issue reports, contract expiry, and recipe ingredient/discard flows; check keyboard focus, Escape/cancel mapping, responsive width, stacked buttons, and dark title/body text. Verify success/error messaging, document preview, and specialized overlays remain intact. Run `npm run lint` and `npm run build`; compare against the starting baseline and review the final diff.
- **Exit gate:** Search all four role areas for remaining in-scope confirmation prompts and account for each remaining match as migrated or explicitly out of scope. Confirm there is a single shared confirmation-dialog presentation implementation and role-owned callbacks. Final review checks acceptance requirements R1–R8.
- **Risks and stop conditions:** Stop on lost form values, changed confirmation semantics, altered success destinations, or accessibility regressions. Do not expand into notification toasts or page-level API alerts without a separate user request.

## 6. Review and completion gates

- No implementation starts until this plan is approved for execution.
- After each phase, inspect only task-owned diff and verify the stated acceptance criteria before moving on.
- Do not stage, commit, push, publish, or deploy as part of this plan.
- Completion means all three phases pass their gates, the four-role dialog inventory is accounted for, lint and build evidence is recorded, and no unrelated working-tree changes were altered.
