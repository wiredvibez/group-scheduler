# Group Scheduler Mini-App Design

Date: 2026-03-17  
Status: Approved for implementation planning  
Scope: MVP

## 1) Goal

Build a simple scheduling app for friends/groups to find the best date/time for an event.

- Authenticated user (owner) creates an appointment and suggested time options.
- Owner shares a public link.
- Anyone with the link can vote on one or multiple time options (per owner setting).
- Submit requires at least one selected option.
- On submit, voter provides configured contact/profile fields.
- After successful submit/update, user sees a Hebrew "finished" page (no auto-close).

## 2) Product Decisions (Locked)

- Framework: Next.js (App Router) + TypeScript + Tailwind.
- Deployment target: Vercel.
- Auth: Firebase Auth with Google provider.
- Database: Firestore.
- Public voting page is open (no login required).
- Admin permission: owner-only (no co-admins in MVP).
- Vote modes:
  - Single selection
  - Limited multi-select (max N)
  - Unlimited multi-select
- Minimum selection rule: always at least 1 selected option.
- Voter results visibility is configurable per appointment:
  - Hidden
  - Visible after submit
  - Visible live
- Configurable voter fields:
  - Name
  - Phone
  - Email
  - Open question (owner defines question text)
  - Birthday
  - Gender
- Duplicate handling:
  - Use machine/device identifier for same-device editing.
  - If same device already submitted, allow edit and resubmit.
  - If different device but email/phone already submitted, prompt:
    - Update existing response
    - Discard
- History requirement: full update trail (no destructive overwrite of history).
- Admin event page must include activity table for submit/update and related actions.
- App language now: Hebrew RTL.
- Infrastructure must support future multi-language expansion.

## 3) Architecture Choice

Chosen approach: **Client-only writes (Approach 1)**.

- UI and data operations run in client app.
- Firestore Security Rules enforce constraints and ownership boundaries.
- No custom backend API in MVP.

### Implications

- Faster MVP delivery.
- Rules must be strict and field-whitelisted.
- Complex validation logic is partially constrained by Rules language; design should keep write shapes deterministic and narrow.

## 4) Pages and Routes

- `/auth`  
  Google sign-in/sign-up page (Firebase Auth).

- `/` (auth-only)  
  Owner landing/dashboard (appointments list + create CTA).

- `/appointments/new`  
  Appointment creation:
  - Basic details
  - Time option management
  - Vote mode settings
  - Results visibility settings
  - Voter fields configuration

- `/appointments/[id]` (owner-only)  
  Appointment admin:
  - Results view
  - Settings controls
  - Responses table
  - Activity table (full history)

- `/a/[publicToken]` (public)  
  Voting page:
  - Options selection by mode
  - Dynamic voter fields
  - Submit/update flow with duplicate checks

- `/a/[publicToken]/done` (public)  
  Hebrew completion page:
  - Confirms save
  - Message: organizer will review all responses and contact soon with final date/time.

## 5) Firestore Data Model

### `appointments/{appointmentId}`

- `ownerUid: string`
- `title: string`
- `description?: string`
- `timezone: string`
- `voteMode: 'single' | 'limited' | 'unlimited'`
- `maxSelections?: number` (required only for `limited`)
- `resultsVisibility: 'hidden' | 'after_submit' | 'live'`
- `contactFieldsConfig: object`
  - flags and required settings per field
  - `openQuestionLabel?: string`
- `publicToken: string` (unique share token)
- `createdAt: timestamp`
- `updatedAt: timestamp`

### `appointments/{id}/timeOptions/{optionId}`

- `label: string`
- `startAt: timestamp`
- `endAt?: timestamp`
- `createdAt: timestamp`

### `appointments/{id}/responses/{responseId}`

- `deviceId: string`
- `selectedOptionIds: string[]` (min 1)
- `contact: object`
  - includes only enabled fields
- `status: 'submitted' | 'updated'`
- `createdAt: timestamp`
- `updatedAt: timestamp`

### `appointments/{id}/activity/{activityId}`

- `type: 'submit' | 'update' | 'reopen' | 'settings_change'`
- `responseId: string`
- `deviceId?: string`
- `contactFingerprint?: string` (non-sensitive normalized hint for traceability)
- `timestamp: timestamp`
- `meta: object` (minimal before/after or changed keys)

## 6) Core Flows

### Owner creates appointment

1. Authenticated owner enters details and settings.
2. Owner adds one or more time options.
3. System creates `publicToken`.
4. Owner shares public URL.

### Public voter submits first response

1. Open public link.
2. Client loads appointment by token and options.
3. Client reads/generates `deviceId` in local storage.
4. Voter selects options (must be >= 1 and meet mode limits).
5. Voter fills configured fields.
6. Response write succeeds.
7. Activity entry `submit` is created.
8. Redirect to done page.

### Same-device update flow

1. Existing response detected by `deviceId`.
2. Form preloads prior values.
3. Voter edits and submits.
4. Existing response updates.
5. Activity entry `update` created.
6. Redirect to done page.

### Different-device duplicate contact flow

1. New device attempts submit with email/phone already present for appointment.
2. UI prompts to confirm update.
3. If confirmed:
  - Update corresponding response.
  - Add `update` activity.
4. If discarded: no write.

## 7) Security Rules Strategy (Mandatory for Approach 1)

Rules goals:

- Owner-only write access for appointment settings and time options.
- Public read access only for required public appointment data and options.
- Public writes allowed only for response/activity schemas.
- Strict field whitelist and structure checks.
- No public delete.

Validation intent:

- `selectedOptionIds` is non-empty.
- Selection count matches vote mode (`single`, `limited`, `unlimited`).
- Contact object only includes fields enabled by appointment config.
- Activity documents are append-only and schema-validated.

Note: since no backend exists in MVP, Rules are the critical trust boundary and must be tested thoroughly.

## 8) i18n and RTL

- Default locale: Hebrew (`he`) with RTL direction globally.
- All user-facing strings use translation keys (no hardcoded literals in components).
- Create dictionary structure now with `he` active and `en` placeholder.
- Date/time formatting uses locale-aware APIs.
- Component layout and spacing should be RTL-safe by default.

## 9) UX and Visual Direction

Style target: modern, responsive, brutalist-futuristic, contrast-aware.

- Strong visual hierarchy and clear primary actions.
- High contrast typography and controls.
- Clear selection states and validation feedback.
- Minimal friction from link open to submit.
- Done page is explicit, reassuring, and in Hebrew.

## 10) Testing Plan (MVP)

- Auth flow on `/auth` and protected landing behavior.
- Appointment creation and option persistence.
- Vote modes:
  - Single
  - Limited max N
  - Unlimited
- Validation: min 1 option selected.
- Dynamic fields render/validate per owner config.
- Same-device edit and resubmit.
- Cross-device duplicate contact prompt and decision paths.
- Results visibility modes: hidden / after_submit / live.
- Owner admin page:
  - Correct aggregated results
  - Full responses list
  - Full activity history integrity
- Hebrew RTL checks on mobile/tablet/desktop breakpoints.

## 11) Out of Scope for MVP

- Co-admins/collaboration.
- Non-Google auth providers.
- Server API/business logic layer.
- Advanced anti-spam/abuse protections.
- Automatic browser tab close after submit.

## 12) Next Step

Create a detailed implementation plan from this approved design, then execute in iterative milestones.
