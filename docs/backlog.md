# HackSuite — Epics, User Stories & Sprint Backlog

**Version:** 1.0
**Date:** 2026-03-28
**Team Size:** 5–8 Senior Engineers
**Sprint Length:** 2 weeks
**Velocity Assumption:** 120–160 story points per sprint (senior team, 6 engineers avg)
**Estimation:** Fibonacci (1, 2, 3, 5, 8, 13, 21)

---

## Table of Contents

1. [Team Structure & Working Agreements](#1-team-structure--working-agreements)
2. [Definition of Ready & Done](#2-definition-of-ready--done)
3. [Epics](#3-epics)
4. [User Stories by Epic](#4-user-stories-by-epic)
5. [Sprint Backlog](#5-sprint-backlog)

---

## 1. Team Structure & Working Agreements

### Recommended Team Composition (6 engineers)

| Role | Count | Primary Ownership |
|---|---|---|
| Tech Lead / Architect | 1 | System design, cross-cutting concerns, code review gate |
| Backend Engineers | 2 | API, data model, background jobs, integrations |
| Frontend Engineers | 2 | React SPA, PWA, component library |
| Full-Stack / DevOps | 1 | Infrastructure, CI/CD, shared tooling, fills gaps |

**Scaling to 8:** Add one backend and one frontend engineer. Assign ownership of Finance+Marketing to the added backend, and Reporting PDF pipeline to the added frontend.

### Working Agreements

- **Standup:** 15 min daily; format: done / doing / blocked
- **PR review:** Required 1 approval from any engineer + 1 from Tech Lead for any auth, data model, or security change
- **Branch strategy:** `main` (production-ready) → `staging` → feature branches (`feat/`, `fix/`, `chore/`)
- **No direct commits to main**
- **Sprint ceremonies:** Planning (4h), Review (1h), Retro (1h), Backlog Refinement (2h mid-sprint)
- **On-call rotation:** Rotates weekly starting sprint 5 (staging environment)

---

## 2. Definition of Ready & Done

### Definition of Ready (story enters sprint)
- [ ] Acceptance criteria written and agreed upon
- [ ] Dependencies identified and unblocked
- [ ] API contract defined if cross-team (BE/FE)
- [ ] Design mockup linked if UI-facing
- [ ] Story points estimated by the team

### Definition of Done (story is complete)
- [ ] Code reviewed and approved
- [ ] Unit tests written (≥ 80% coverage on new code)
- [ ] Integration tests passing (real DB, not mocks)
- [ ] API contract matches spec
- [ ] Deployed to staging and smoke-tested
- [ ] Accessibility checked (axe-core) for any UI work
- [ ] No P0/P1 bugs introduced
- [ ] Feature flag removed if applicable

---

## 3. Epics

| ID | Epic | Modules Covered | Priority |
|---|---|---|---|
| E-00 | Foundation & Infrastructure | All | P0 |
| E-01 | Registration & Applications | REG | P0 |
| E-02 | Check-in & Attendance | CHK | P0 |
| E-03 | Schedule & Logistics | SCH | P1 |
| E-04 | Project Submissions & Judging | JDG | P0 |
| E-05 | Sponsor Management | SPO | P1 |
| E-06 | Finance & Budgeting | FIN | P1 |
| E-07 | Marketing & Outreach | MKT | P2 |
| E-08 | Post-Event Reporting | RPT | P1 |
| E-09 | Multi-Tenancy & Auth | Auth | P0 |
| E-10 | Integrations & Extensibility | All | P2 |

---

## 4. User Stories by Epic

---

### E-00 — Foundation & Infrastructure

#### US-001 · Monorepo & Project Scaffolding
**As** the tech lead,
**I want** a monorepo with clearly separated packages for `api`, `web`, `workers`, and `shared`,
**so that** the team can develop, test, and deploy each layer independently without coupling.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Monorepo initialized (Turborepo or Nx) with `apps/api`, `apps/web`, `packages/shared`
- [ ] TypeScript configured end-to-end with strict mode
- [ ] Shared types package importable by both api and web
- [ ] `pnpm install` from root installs all workspaces
- [ ] `pnpm dev` starts API (port 3000) and web (port 5173) concurrently

**User Tests:**
```
T-001-1: Run `pnpm install` from root — exits 0, no errors
T-001-2: Run `pnpm dev` — both API and web start; http://localhost:3000/health returns 200
T-001-3: Import a type from `@hacksuite/shared` in both api and web — TypeScript compiles without error
T-001-4: Run `pnpm typecheck` from root — exits 0
```

---

#### US-002 · Docker Compose Local Environment
**As** any engineer,
**I want** a single `docker compose up` command to start the full local stack,
**so that** onboarding takes minutes and environment drift between engineers is eliminated.

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Compose file starts: PostgreSQL 16, Redis 7, API, Web, Mailhog
- [ ] Database initializes with seed schema on first run
- [ ] Volumes persist data between restarts; `docker compose down -v` resets cleanly
- [ ] `.env.example` documents every required environment variable
- [ ] README documents local setup in ≤ 5 steps

**User Tests:**
```
T-002-1: Clone repo on a fresh machine, run `docker compose up` — all services healthy within 60s
T-002-2: Send POST /health to API — returns { status: "ok", db: "connected", redis: "connected" }
T-002-3: Stop and restart containers — previously seeded data persists
T-002-4: Run `docker compose down -v && docker compose up` — clean state, no migration errors
```

---

#### US-003 · CI/CD Pipeline
**As** the team,
**I want** an automated pipeline that runs tests, builds images, and deploys to staging on merge to main,
**so that** broken code never reaches staging and deployments are repeatable.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] GitHub Actions pipeline: lint → typecheck → unit tests → integration tests → build → push image → deploy staging
- [ ] Integration tests run against a real PostgreSQL instance (not mocks)
- [ ] Build fails fast: lint/typecheck failures block before running slower tests
- [ ] Staging deploy is automatic on merge to `main`; production deploy requires manual approval
- [ ] Slack/Discord webhook notifies team of deploy status

**User Tests:**
```
T-003-1: Push a branch with a TypeScript error — pipeline fails at typecheck step, no image built
T-003-2: Push a branch with a failing test — pipeline fails at test step
T-003-3: Merge a green PR to main — staging deploy completes within 10 minutes
T-003-4: Trigger production deploy — requires manual approval click in GitHub Actions
T-003-5: Staging deploy notification appears in team Slack channel
```

---

#### US-004 · Database Schema & Migrations
**As** a backend engineer,
**I want** a migration-based schema management system,
**so that** schema changes are versioned, reviewable, and applied automatically on deploy.

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Migration tool configured (Flyway or golang-migrate equivalent for Node)
- [ ] Core tables created: `organizations`, `events`, `users`, `organization_members`, `event_permissions`, `participants`
- [ ] RLS policies applied to all tenant-scoped tables
- [ ] Migrations run automatically on API startup (dev) and as a deploy step (staging/prod)
- [ ] `pnpm db:migrate` and `pnpm db:rollback` commands work locally

**User Tests:**
```
T-004-1: Fresh database — run migrations — all tables created, no errors
T-004-2: Run migrations twice — idempotent, no duplicate table errors
T-004-3: Insert a row into `participants` with a different `event_id` than the RLS context — query returns 0 rows
T-004-4: Roll back latest migration — schema returns to previous state cleanly
```

---

### E-09 — Multi-Tenancy & Auth

#### US-010 · Organization Registration & Onboarding
**As** a hackathon organizer,
**I want** to create an organization account with my team's name and email domain,
**so that** my team has an isolated workspace on HackSuite.

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Sign-up flow: name, slug (auto-generated, editable), contact email
- [ ] Slug is globally unique; duplicate slugs return a clear error
- [ ] Creating org automatically assigns the creator as `owner`
- [ ] Org dashboard is accessible at `/org/:slug/dashboard` immediately after creation
- [ ] Welcome email sent to owner on org creation

**User Tests:**
```
T-010-1: Create org with slug "urichacks" — org created, owner role assigned, redirected to dashboard
T-010-2: Create second org with slug "urichacks" — returns 409 with message "slug already taken"
T-010-3: New org owner receives welcome email within 60 seconds
T-010-4: Owner logs out and back in — dashboard accessible, org data intact
```

---

#### US-011 · Team Member Invitations & Role Assignment
**As** an org owner or admin,
**I want** to invite team members by email and assign them roles,
**so that** organizers have appropriate access without sharing credentials.

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Owner/admin can invite users by email with a role: `admin` or `organizer`
- [ ] Invitee receives an email with a one-time accept link (expires 72 hours)
- [ ] Organizer role requires module access selection at invite time (checkboxes per module)
- [ ] Owner can revoke access at any time; revoked user loses access on next request
- [ ] Org member list paginated and filterable by role

**User Tests:**
```
T-011-1: Invite user@example.com as organizer with checkin + finance access — invite email sent
T-011-2: Accept invite link — user gains access to checkin and finance modules only; cannot access judging
T-011-3: Accept invite link after 73 hours — returns "link expired" error
T-011-4: Owner revokes member — member's next API call returns 403
T-011-5: Accept same invite link twice — second attempt returns "link already used"
```

---

#### US-012 · JWT Authentication & Session Management
**As** the system,
**I want** short-lived JWTs with refresh token rotation,
**so that** compromised tokens have minimal blast radius.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Access token: 15-minute TTL, signed RS256
- [ ] Refresh token: 7-day TTL, stored as httpOnly cookie, rotated on each use
- [ ] JWT claims include: `user_id`, `org_id`, `roles`, `event_permissions`
- [ ] Refresh token reuse detection: if a used token is reused, entire refresh family is invalidated
- [ ] All protected endpoints return 401 with `WWW-Authenticate: Bearer` on missing/invalid token

**User Tests:**
```
T-012-1: Call protected endpoint with valid access token — 200
T-012-2: Call protected endpoint with expired access token — 401
T-012-3: Use refresh token to get new access token — new token issued, old refresh token invalidated
T-012-4: Reuse old (rotated) refresh token — entire session invalidated, both tokens rejected
T-012-5: Call endpoint with valid token but insufficient role — 403
```

---

### E-01 — Registration & Applications

#### US-020 · Custom Application Form Builder
**As** an organizer,
**I want** to build a custom registration form with conditional logic,
**so that** I collect exactly the data my event needs without building a separate form tool.

**Story Points:** 13

**Acceptance Criteria:**
- [ ] Field types: text, textarea, email, select, multi-select, checkbox, file upload, section header
- [ ] Conditional display: show/hide field based on another field's value
- [ ] Field-level validation: required, min/max length, regex pattern
- [ ] Form preview mode renders the participant-facing view in real time
- [ ] Form schema stored as JSONB; form definition versioned (changes after submissions are recorded log to what schema version responses were collected under)
- [ ] MLH consent checkbox available as a built-in field type with standard MLH copy

**User Tests:**
```
T-020-1: Add a select field "Do you have a team?" with options Yes/No; add a conditional text field "Team name" that shows only when Yes is selected — preview shows conditional behavior correctly
T-020-2: Mark a field as required; submit form without it — validation error returned with field name
T-020-3: Submit a form with a file upload — file stored in S3; participant record has signed URL reference
T-020-4: Update form after 10 submissions exist — existing submissions remain readable against their original schema version
T-020-5: Add MLH consent field — renders with correct MLH legal copy, cannot be edited by organizer
```

---

#### US-021 · Participant Application Submission
**As** a participant,
**I want** to submit an application and receive a confirmation,
**so that** I know my registration was received.

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Application form accessible at `{event-slug}.hacksuite.app` without login
- [ ] Submission creates participant record with status `applied`
- [ ] Duplicate detection: same email + event_id returns 409 with "already applied" message
- [ ] Confirmation email sent within 60 seconds of submission
- [ ] Participant receives a "check your status" link to a read-only profile page

**User Tests:**
```
T-021-1: Submit application on public form — participant record created with status "applied"; confirmation email received
T-021-2: Submit same email twice for same event — 409 returned, no duplicate record created
T-021-3: Submit with missing required field — 422 returned, specific field identified in error
T-021-4: Check status link in email — loads participant profile showing "Application received"
```

---

#### US-022 · Acceptance Workflow & Waitlist Management
**As** an organizer,
**I want** to accept, reject, and waitlist applicants with bulk actions,
**so that** I can process hundreds of applications without tedious one-by-one review.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Organizer dashboard lists all participants with status filters and column sort
- [ ] Bulk actions: select N participants → set status (accepted / waitlisted / rejected)
- [ ] Accepted participants receive email with unique QR code (SVG embed + attachment)
- [ ] Waitlisted participants receive waitlist position email
- [ ] Auto-promotion: when an accepted participant's confirmation deadline passes without RSVP, the top waitlisted participant is automatically promoted and emailed
- [ ] Automatic mode: if enabled, first N applicants are auto-accepted on submission

**User Tests:**
```
T-022-1: Select 50 applicants, bulk-accept — all 50 status updated to "accepted"; 50 QR emails queued within 5 minutes
T-022-2: Accepted participant does not confirm by RSVP deadline — status moves to "no_show"; top waitlist participant promoted to "accepted" and emailed
T-022-3: Enable auto-accept for first 200 — 201st applicant receives waitlist email, not acceptance
T-022-4: Bulk-reject 10 — 10 participants updated; rejected email sent; they cannot re-apply to the same event
T-022-5: Filter participants by status "waitlisted" + school "URI" — returns correct filtered set
```

---

#### US-023 · Registration Landing Page Customization
**As** an organizer,
**I want** to customize the public registration page with my event's branding,
**so that** participants see a professional, on-brand first impression.

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Settings panel: upload logo, set primary color (hex), upload cover image, edit hero text, set event date display, add social links (Twitter, Instagram, Discord, LinkedIn)
- [ ] Changes preview live in the settings panel before publish
- [ ] Published page live at `{event-slug}.hacksuite.app`
- [ ] Page renders correctly on mobile (375px) and desktop (1280px)
- [ ] Open Graph meta tags populated (og:title, og:image, og:description) for social sharing

**User Tests:**
```
T-023-1: Upload logo, set primary color #7C3AED, save — landing page immediately reflects changes
T-023-2: View landing page at 375px width — no horizontal scroll; CTA button visible above fold
T-023-3: Share landing page URL on Slack — og:title and og:image render in link preview
T-023-4: Set "registration closed" toggle — form hidden, "Applications closed" message shown
```

---

### E-02 — Check-in & Attendance

#### US-030 · Mobile QR Scanner (No App Required)
**As** an organizer on event day,
**I want** to scan participant QR codes from my phone browser,
**so that** I can check people in without installing an app or carrying a laptop.

**Story Points:** 13

**Acceptance Criteria:**
- [ ] Camera access via browser WebRTC API; works on iOS Safari 16+ and Android Chrome 110+
- [ ] QR decoded client-side (jsQR or zxing-js); decoded value POSTed to `/events/:id/checkin`
- [ ] Scan-to-response time ≤ 300ms on a fast 3G connection (simulated in Chrome DevTools)
- [ ] Success state: participant name, photo (if provided), accommodation flags shown for 2 seconds; scanner resets automatically
- [ ] Error states: "already checked in" (amber), "not found" (red), "not accepted" (red) — distinct visual treatment
- [ ] Works in landscape and portrait orientation

**User Tests:**
```
T-030-1: Scan valid QR on 3G throttle — response received and displayed within 300ms
T-030-2: Scan a QR for participant with dietary restriction "vegan" — "VEGAN" flag shown prominently on confirmation screen
T-030-3: Scan same QR twice — second scan shows "Already checked in at [time]" in amber
T-030-4: Scan QR on iOS Safari — camera opens without prompting app install
T-030-5: Scan a QR code for a waitlisted participant — red error "Participant not accepted"
```

---

#### US-031 · Offline Check-in Mode
**As** an organizer,
**I want** check-in to work when the venue WiFi fails,
**so that** a network outage doesn't cause a 200-person line at the door.

**Story Points:** 13

**Acceptance Criteria:**
- [ ] PWA service worker caches check-in shell and participant QR lookup table on page load
- [ ] When offline: scans write to IndexedDB queue with `{ qr_code, scanned_at, device_id, synced: false }`
- [ ] Offline mode banner clearly visible; scan count displayed ("12 scans queued")
- [ ] On reconnect: queued batch auto-syncs via `POST /events/:id/checkin/sync`
- [ ] Server deduplicates by `qr_code + event_id`; returns conflicts (same QR scanned on two devices)
- [ ] Conflicts shown in organizer dashboard for manual review

**User Tests:**
```
T-031-1: Load check-in page, disconnect network, scan 5 QR codes — all 5 stored in IndexedDB; banner shows "5 scans queued (offline)"
T-031-2: Reconnect — 5 scans sync automatically; banner shows "Synced"; participants marked checked_in in dashboard
T-031-3: Two devices scan same QR while offline; both reconnect — server deduplicates; conflict appears in dashboard with both device timestamps
T-031-4: Reload page while offline after initial load — scanner still loads and functions from service worker cache
```

---

#### US-032 · Live Check-in Dashboard
**As** an organizer,
**I want** a real-time dashboard showing check-in progress,
**so that** I know how many people have arrived and can spot issues instantly.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Dashboard shows: checked in, confirmed total, no-shows, accommodations count
- [ ] Numbers update in real time via WebSocket without page refresh
- [ ] Activity feed: last 20 check-in events (name, time) in descending order, live-updating
- [ ] Filterable participant list: status, school, dietary flags
- [ ] Export checked-in list as CSV (name, email, time, school)

**User Tests:**
```
T-032-1: Open dashboard; scan a QR on another device — counter increments within 500ms; name appears in activity feed
T-032-2: 50 participants check in simultaneously — all 50 reflected within 2 seconds
T-032-3: Filter by dietary "gluten-free" — returns only gluten-free checked-in participants
T-032-4: Export CSV — file downloads; contains correct headers and one row per checked-in participant
```

---

#### US-033 · Walk-in Registration
**As** an organizer,
**I want** to register and check in a walk-in participant on the spot,
**so that** unregistered attendees aren't turned away at the door.

**Story Points:** 3

**Acceptance Criteria:**
- [ ] "Walk-in" button on check-in screen opens a minimal form: first name, last name, email, school
- [ ] Submitting creates participant record with status `checked_in` immediately
- [ ] QR code displayed on-screen for badge printing
- [ ] Walk-in participants marked with a "walk-in" flag visible in the dashboard

**User Tests:**
```
T-033-1: Complete walk-in form — participant created with checked_in status; QR displayed on screen within 1 second
T-033-2: Attempt walk-in with an email that already exists in the event — error "Email already registered"; option to check them in by email search
T-033-3: Walk-in participant appears in dashboard with "walk-in" badge
```

---

### E-03 — Schedule & Logistics

#### US-040 · Agenda Builder
**As** an organizer,
**I want** to build the event agenda with time blocks and room assignments,
**so that** I have a conflict-free schedule I can publish to participants.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Create block with: title, type (workshop/meal/judging/ceremony/break), start, end, location (room or URL), capacity, description (optional)
- [ ] Visual timeline view (horizontal by time, rows by room) renders blocks
- [ ] Conflict detection: saving a block that overlaps another block in the same room triggers a blocking warning (not just a toast)
- [ ] Blocks can be dragged on the timeline to adjust time (optional for MVP — can be keyboard input)
- [ ] "Publish schedule" toggle makes schedule visible to participants

**User Tests:**
```
T-040-1: Create block "Opening Ceremony" 9:00–9:30 in Room A — appears on timeline
T-040-2: Create second block 9:15–9:45 in Room A — conflict warning appears; block not saved until confirmed override or time changed
T-040-3: Publish schedule — landing page /schedule route shows agenda; unpublish hides it
T-040-4: Add 20 blocks — timeline renders without performance degradation; all blocks visible
```

---

#### US-041 · Participant-Facing Schedule
**As** a participant,
**I want** to view the event schedule on my phone without logging in,
**so that** I know where to be and when.

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Schedule accessible at `{event-slug}.hacksuite.app/schedule` (no login required)
- [ ] Mobile-optimized: readable at 375px; tap to expand block details
- [ ] "Now" indicator shows current time position in schedule
- [ ] Schedule updates pushed via WebSocket; participant sees changes without refresh
- [ ] Cached for offline read after first load (service worker)

**User Tests:**
```
T-041-1: View schedule on 375px mobile — no horizontal scroll; blocks clearly readable
T-041-2: Organizer updates block title — participant's open schedule page reflects change within 1 second (no reload)
T-041-3: Load schedule, go offline, reload page — schedule loads from cache; "you're offline" banner shown
T-041-4: "Now" indicator moves to correct current-time position on page
```

---

#### US-042 · Push Notifications to Participants
**As** an organizer,
**I want** to send push notifications to checked-in participants,
**so that** I can announce schedule changes and meal reminders without a PA system.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Participants are prompted for Web Push permission on first schedule page load
- [ ] Organizer compose form: title (50 char max), body (140 char max), target (all / checked-in / by track / by dietary flag)
- [ ] Preview shows estimated recipient count before send
- [ ] Notifications delivered via Web Push API (VAPID keys managed by server)
- [ ] Sent notification log shows: title, sent time, target count, delivered count

**User Tests:**
```
T-042-1: Send notification to "all checked-in" with 100 checked-in participants — notification appears on participant device within 10 seconds
T-042-2: Send notification targeted to "vegan" dietary flag — only vegan participants receive it
T-042-3: Compose notification with 141-character body — validation error before send
T-042-4: Participant has denied push permission — not included in delivery count; no error thrown
```

---

### E-04 — Project Submissions & Judging

#### US-050 · Project Submission Portal
**As** a participant,
**I want** to submit my project with all relevant links and track selection,
**so that** judges can evaluate my work without me emailing anything separately.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Submission form: title, description (markdown, live preview), demo URL, GitHub/GitLab URL, track selection (multi-select from event tracks), optional file (< 50MB)
- [ ] One submission per team; all team members can edit until the portal closes
- [ ] Portal enforces open/close timestamps; submitting outside window returns 403 with reason
- [ ] Last-edit timestamp shown on submission; edit history retained (not exposed to judges)
- [ ] Submission confirmation email sent to all team members

**User Tests:**
```
T-050-1: Submit project with all fields — submission created; confirmation email sent to all 3 team members
T-050-2: Second team member edits submission description — edit saved; first member refreshes and sees update
T-050-3: Submit after portal close time — 403 returned with "Submissions closed at [time]"
T-050-4: Submit markdown description with headers and code blocks — live preview renders correctly; stored and displayed to judges correctly
T-050-5: Upload 51MB file — rejected with "File exceeds 50MB limit"
```

---

#### US-051 · Judge Assignment & Workload Balancing
**As** an organizer,
**I want** to assign judges to tracks and have the system balance workloads automatically,
**so that** no judge reviews 30 projects while another reviews 3.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Organizer assigns judges to one or more tracks from a judge management UI
- [ ] System distributes submissions to judges within a track: round-robin by default; configurable to random
- [ ] Double-booking detection: if a judge is assigned to two tracks with overlapping schedule slots, a blocking alert is shown
- [ ] Judge receives magic link email with access to their assigned queue (no account required)
- [ ] Workload summary: submissions per judge, scored vs. unscored count

**User Tests:**
```
T-051-1: Assign 3 judges to a track with 30 submissions — each judge assigned 10 submissions automatically
T-051-2: Assign same judge to Track A (2pm–4pm) and Track B (3pm–5pm) — overlap warning fires; assignment not saved until confirmed
T-051-3: Judge clicks magic link — lands on their submission queue; no password or account creation required
T-051-4: Magic link used after event end date — returns "Judging has closed" message
```

---

#### US-052 · Scoring Rubric & Judge Portal
**As** a judge,
**I want** to score submissions on a clear rubric from my phone,
**so that** I can evaluate projects quickly without paper or spreadsheets.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Rubric configurable per track: up to 8 criteria, each with label, description, max score (1–10)
- [ ] Judge portal: mobile-optimized, shows one submission at a time with all links accessible
- [ ] Judge scores each criterion with a slider or number input; can add a text note per submission
- [ ] Scores auto-save on change; no explicit submit button needed per criterion
- [ ] Judges cannot see other judges' scores until organizer publishes results
- [ ] Progress indicator: "7 of 10 submissions scored"

**User Tests:**
```
T-052-1: Score all criteria for a submission on mobile (375px) — all sliders accessible without horizontal scroll
T-052-2: Close browser mid-scoring and reopen magic link — scores entered so far are preserved
T-052-3: Attempt to view another judge's scores via API — 403 returned
T-052-4: Score 9 of 10 submissions, close link — progress shows "9 of 10" on next open; incomplete submissions flagged for organizer
```

---

#### US-053 · Live Leaderboard & Results
**As** an organizer,
**I want** a live leaderboard that updates as judges submit scores,
**so that** I can track judging progress and announce winners immediately when scoring closes.

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Leaderboard per track: submissions ranked by weighted average score
- [ ] Updates in real time via WebSocket as scores are submitted
- [ ] Organizer can toggle public visibility (hidden by default until they flip it)
- [ ] Tie-breaking: configurable as random or by a secondary criterion
- [ ] CSV export: all submissions, all scores, final rankings

**User Tests:**
```
T-053-1: Judge submits a score — leaderboard rank updates within 1 second for organizer view
T-053-2: Toggle public leaderboard on — participants can view at `/events/:id/leaderboard/:track`
T-053-3: Two submissions tied on score — tie-breaking rule applied; deterministic result (not random order on reload)
T-053-4: Export CSV — contains submission title, team name, each criterion score, final weighted score, rank
```

---

### E-05 — Sponsor Management

#### US-060 · Sponsor Profile & Tier Management
**As** an organizer,
**I want** to create sponsor profiles with tiers and track deliverables,
**so that** I never miss a sponsorship commitment during the event.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Organizer defines tiers (name, benefits description, amount) before adding sponsors
- [ ] Sponsor profile: name, tier, point of contact (name + email + phone), logo upload, description, payment status (expected / received / date)
- [ ] Deliverable checklist per sponsor: title, due date, completion toggle, evidence attachment (link or file)
- [ ] Overdue deliverables (due date passed, incomplete) shown as red alerts in the organizer dashboard header
- [ ] Sponsor list sortable by tier, payment status, deliverable completion rate

**User Tests:**
```
T-060-1: Create "Gold" tier; add sponsor "Acme Corp" at Gold tier — profile created with Gold badge
T-060-2: Add deliverable "Logo on website" due today; leave incomplete — alert appears in dashboard header
T-060-3: Mark deliverable complete, attach evidence URL — deliverable shows green checkmark; alert clears
T-060-4: Log sponsor payment of $2,000 against expected $5,000 — profile shows "$2,000 / $5,000 received"
```

---

#### US-061 · Sponsor Portal (Read-Only)
**As** a sponsor contact,
**I want** to log in and view my sponsorship profile and deliverable status,
**so that** I don't need to email the organizing team for status updates.

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Organizer can grant sponsor portal access by entering sponsor POC email
- [ ] Sponsor receives magic link to a read-only portal showing: their profile, deliverable checklist (view-only), payment status
- [ ] Sponsor cannot view other sponsors' data
- [ ] Post-event: sponsor portal shows their recap metrics (attendance count, demographic summary, prize winners relevant to their track)

**User Tests:**
```
T-061-1: Grant portal access to sponsor@acme.com — invite email sent with magic link
T-061-2: Sponsor clicks link — sees only their own profile; no navigation to other sponsors
T-061-3: Attempt to access another sponsor's profile URL — 403 returned
T-061-4: Post-event: sponsor portal shows attendance figure and their prize track winner
```

---

### E-06 — Finance & Budgeting

#### US-070 · Budget Planning & Tracking
**As** an organizer,
**I want** to build a budget and track actual spend against it,
**so that** I don't overspend and can justify costs to university administration.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Budget has line items: category (enum: catering, swag, venue, prizes, travel, A/V, misc), description, estimated amount
- [ ] Income sources tracked: university funding, MLH grant, sponsor payments (auto-populated from Sponsor module when payment logged)
- [ ] Dashboard shows: total income, total estimated, total actual, variance, remaining balance
- [ ] Per-head cost calculated as: total actual spend / confirmed check-in count (live)
- [ ] Warn if actual spend exceeds estimated on any line item (visual flag, not a block)

**User Tests:**
```
T-070-1: Add line item "Catering" estimated $3,000; log $3,200 actual — line item shows red variance flag; remaining balance updates
T-070-2: Log sponsor payment of $5,000 in Sponsor module — Finance dashboard shows income +$5,000 automatically
T-070-3: 150 participants check in — per-head cost updates live on finance dashboard
T-070-4: Budget dashboard loads with correct totals matching sum of all line items
```

---

#### US-071 · Expense Submission & Reimbursement Workflow
**As** an organizer,
**I want** to submit expenses with receipts and get reimbursed through the platform,
**so that** reimbursements don't get lost in email chains.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Any organizer can submit: amount, category, description, receipt (image or PDF upload, max 10MB)
- [ ] Workflow states: `submitted → approved → paid` (or `rejected`)
- [ ] Approval requires `admin` or `owner` role; approver cannot approve their own expense
- [ ] Rejected expenses require a rejection reason; submitter is emailed
- [ ] Export: all expenses as CSV with status, amount, category, submitter, approver, date

**User Tests:**
```
T-071-1: Submit expense $45 "Printer paper" with receipt PDF — status shows "submitted"; admin sees it in approval queue
T-071-2: Admin approves expense — status moves to "approved"; submitter receives email confirmation
T-071-3: Submitter tries to approve their own expense — approve button disabled; API returns 403
T-071-4: Admin rejects expense with reason — submitter receives email with rejection reason
T-071-5: Export expenses CSV — all columns present; amounts sum correctly
```

---

### E-07 — Marketing & Outreach

#### US-080 · Email Campaign Builder
**As** an organizer,
**I want** to send branded emails to participant segments,
**so that** I can drive registrations and communicate event updates without a separate email tool.

**Story Points:** 13

**Acceptance Criteria:**
- [ ] Block-based email editor: text, image, button, divider, header blocks; drag to reorder
- [ ] Pre-built hackathon templates: "Applications Open", "You're Accepted", "Event Reminder", "Results Announced"
- [ ] Recipient targeting: all applicants / accepted only / waitlisted / custom filter (by school, dietary, track)
- [ ] Schedule send: pick date + time or send immediately
- [ ] Metrics webhook: delivered, opened, clicked updated within 5 minutes of send
- [ ] Unsubscribe link auto-injected; unsubscribed participants excluded from future sends

**User Tests:**
```
T-080-1: Build email using "Applications Open" template; customize hero text — preview renders correctly in email client simulation
T-080-2: Schedule send for +1 hour — email sends at correct time; metrics update after delivery
T-080-3: Send to "accepted only" segment — only accepted participants receive it; waitlisted do not
T-080-4: Participant clicks unsubscribe — excluded from next campaign send; unsubscribe list visible to organizer
T-080-5: Send campaign to 500 participants — all delivered within 10 minutes; no rate limit errors
```

---

#### US-081 · Referral Link Tracking & Hype Dashboard
**As** an organizer,
**I want** to see which marketing channels are driving registrations,
**so that** I know where to focus my outreach effort.

**Story Points:** 8

**Acceptance Criteria:**
- [ ] Generate UTM-tagged referral links per channel: Instagram bio, Discord, flyer QR, email footer, etc.
- [ ] Each link click tracked (page view); conversion tracked when application submitted through that link
- [ ] Hype dashboard: registration growth chart (daily, cumulative), breakdown by referral source, conversion rate per channel
- [ ] Landing page visit counter (privacy-respecting; no PII stored per visit)
- [ ] Dashboard data refreshes every 5 minutes

**User Tests:**
```
T-081-1: Generate "Instagram bio" link — UTM params appended correctly; link redirects to registration page
T-081-2: Click Instagram link and submit application — application attributed to Instagram channel in dashboard
T-081-3: View hype dashboard — chart shows registration growth by day; Instagram shows higher conversion than Discord
T-081-4: Dashboard shows conversion rate: (submissions / page views) per channel
```

---

#### US-082 · Social Copy Generator
**As** an organizer,
**I want** AI-generated social captions for my event,
**so that** I spend 5 minutes on marketing copy instead of 45.

**Story Points:** 5

**Acceptance Criteria:**
- [ ] Input fields: event name, dates, location, theme, target audience (e.g., "CS freshmen and sophomores")
- [ ] Generates drafts for: Twitter/X (280 char), Instagram caption, LinkedIn post, Discord announcement
- [ ] Output is editable in-place before copying
- [ ] "Regenerate" button produces a new variation
- [ ] Calls Claude API (`claude-sonnet-4-6`) via backend; API key never exposed to client

**User Tests:**
```
T-082-1: Enter event details and generate — four distinct captions produced within 5 seconds
T-082-2: Twitter/X output is ≤ 280 characters
T-082-3: Click "Regenerate" — new, different variation produced (not the same output repeated)
T-082-4: Edit generated caption in-place — edited text preserved; copy-to-clipboard copies edited version
T-082-5: Inspect network traffic — Claude API key not present in any client-side request
```

---

### E-08 — Post-Event Reporting

#### US-090 · Auto-Assembled Event Report
**As** an organizer,
**I want** the post-event report to be auto-populated from live data,
**so that** I spend 20 minutes writing a summary rather than 4 hours copying data between docs.

**Story Points:** 13

**Acceptance Criteria:**
- [ ] Report auto-assembles after event end date: pulls attendance (Check-in), demographics (Registration), judging results (Judging), budget summary (Finance), top channels (Marketing)
- [ ] Organizer can add: written summary (rich text), up to 20 photos (drag-and-drop, stored in S3)
- [ ] Two export modes: Internal (all sections) and Sponsor-facing (attendance, demographics, prize winners, deliverable status — no budget figures)
- [ ] PDF export triggered as async job; download link emailed when ready (< 30s)
- [ ] Report snapshot is immutable once exported (separate `report_snapshots` table)
- [ ] Shareable org-scoped link for institutional handoff (next year's team can view)

**User Tests:**
```
T-090-1: Trigger report after event end — all sections populated with live data; no manual data entry required
T-090-2: Export internal PDF — downloads with all sections; budget figures present
T-090-3: Export sponsor PDF — downloads without budget section; only sponsor-relevant metrics shown
T-090-4: Export PDF — download link emailed within 30 seconds
T-090-5: Generate share link — next year's organizer (different account) can view report at share link without logging in
T-090-6: Re-export after editing summary — new snapshot created; old snapshot unchanged and still downloadable
```

---

## 5. Sprint Backlog

**Assumptions:**
- 6-engineer team, 2-week sprints
- Velocity: ~130 points/sprint
- Sprints 0–6 deliver MVP (all P0 and P1 epics)
- Sprint 7 delivers P2 epics and beta hardening

---

### Sprint 0 — Foundation (Weeks 1–2)
**Goal:** Team can develop locally, CI runs, core schema exists, auth works end-to-end.
**Capacity:** 130 pts

| Story | Title | Points | Owner |
|---|---|---|---|
| US-001 | Monorepo & Project Scaffolding | 8 | Tech Lead |
| US-002 | Docker Compose Local Environment | 5 | DevOps |
| US-003 | CI/CD Pipeline | 8 | DevOps |
| US-004 | Database Schema & Migrations | 5 | Backend 1 |
| US-010 | Organization Registration & Onboarding | 5 | Backend 1 |
| US-011 | Team Member Invitations & Role Assignment | 5 | Backend 2 |
| US-012 | JWT Authentication & Session Management | 8 | Backend 2 |
| — | Design system: TailwindCSS config, base component library (Button, Input, Card, Modal, Table) | 8 | Frontend 1 |
| — | Auth UI: Sign-in, Org creation, Accept invite flows | 8 | Frontend 2 |
| — | Org dashboard shell + navigation layout | 5 | Frontend 1 |
| — | API error handling middleware + logging (Pino) | 3 | Backend 1 |
| — | Seed data script for local development | 3 | Full-Stack |

**Sprint 0 Total:** 71 pts
*(Lower intentionally — setup overhead, knowledge alignment, first-sprint friction)*

**Sprint 0 Exit Criteria:**
- [ ] Engineer can clone repo, run `docker compose up`, create an org, invite a teammate, and log in as that teammate in < 30 minutes
- [ ] CI pipeline passes on a green PR
- [ ] Org dashboard accessible with correct role gating

---

### Sprint 1 — Registration & Applications (Weeks 3–4)
**Goal:** Participants can apply; organizers can accept and issue QR codes.
**Capacity:** 130 pts

| Story | Title | Points | Owner |
|---|---|---|---|
| US-020 | Custom Application Form Builder | 13 | Backend 1 + Frontend 1 |
| US-021 | Participant Application Submission | 5 | Backend 2 |
| US-022 | Acceptance Workflow & Waitlist Management | 8 | Backend 2 |
| US-023 | Registration Landing Page Customization | 5 | Frontend 2 |
| — | Email service integration (Resend) — transactional templates | 5 | Backend 1 |
| — | QR code generation service (SVG, unique per participant) | 3 | Backend 1 |
| — | Participant management dashboard UI (list, filters, bulk actions) | 8 | Frontend 1 |
| — | Participant status state machine + audit log | 5 | Backend 2 |
| — | S3 file upload service (receipts, form files) with presigned URLs | 5 | DevOps + Backend 1 |
| — | Form builder UI: drag-and-drop fields, conditional logic editor | 13 | Frontend 1 + Frontend 2 |

**Sprint 1 Total:** 70 pts + shared work ≈ 130 pts

**Sprint 1 Exit Criteria:**
- [ ] End-to-end flow: build form → participant submits on public URL → organizer accepts → QR email sent → participant receives QR
- [ ] Bulk-accept 50 participants in under 3 seconds
- [ ] Landing page live with custom branding at `test-event.hacksuite.app`

---

### Sprint 2 — Check-in & Schedule (Weeks 5–6)
**Goal:** Organizers can run event-day check-in; participants can view schedule.
**Capacity:** 130 pts

| Story | Title | Points | Owner |
|---|---|---|---|
| US-030 | Mobile QR Scanner (No App Required) | 13 | Frontend 2 |
| US-031 | Offline Check-in Mode | 13 | Frontend 2 + Full-Stack |
| US-032 | Live Check-in Dashboard | 8 | Backend 1 + Frontend 1 |
| US-033 | Walk-in Registration | 3 | Backend 2 |
| US-040 | Agenda Builder | 8 | Backend 2 + Frontend 1 |
| US-041 | Participant-Facing Schedule | 5 | Frontend 1 |
| US-042 | Push Notifications to Participants | 8 | Backend 1 + Frontend 2 |
| — | WebSocket infrastructure (connection management, rooms, pub/sub via Redis) | 8 | Backend 1 |
| — | PWA manifest + service worker (Workbox) setup | 5 | Frontend 2 |
| — | Check-in event append-only log table + conflict resolution logic | 3 | Backend 2 |

**Sprint 2 Total:** 74 pts + infra work ≈ 130 pts

**Sprint 2 Exit Criteria:**
- [ ] Simulate event-day: 5 simultaneous QR scanners, 200 scans, live dashboard updates in real time
- [ ] Cut WiFi mid-test: 10 offline scans queued, reconnect, all 10 sync correctly
- [ ] Schedule published and visible on mobile; organizer push notification received within 10 seconds

---

### Sprint 3 — Judging & Submissions (Weeks 7–8)
**Goal:** Participants can submit projects; judges can score; leaderboard works.
**Capacity:** 130 pts

| Story | Title | Points | Owner |
|---|---|---|---|
| US-050 | Project Submission Portal | 8 | Backend 1 + Frontend 1 |
| US-051 | Judge Assignment & Workload Balancing | 8 | Backend 2 |
| US-052 | Scoring Rubric & Judge Portal | 8 | Backend 2 + Frontend 2 |
| US-053 | Live Leaderboard & Results | 5 | Backend 1 + Frontend 1 |
| — | Track management UI (create tracks, assign prizes) | 5 | Frontend 1 |
| — | Judge magic link auth flow (no account required) | 5 | Backend 1 |
| — | Submission portal public UI (participant-facing) | 8 | Frontend 2 |
| — | Score calculation engine (weighted average, tie-breaking) | 5 | Backend 2 |
| — | Judge assignment UI + conflict detection alerts | 8 | Frontend 1 |
| — | CSV export for scores | 3 | Backend 1 |
| — | Rubric builder UI (per-track, up to 8 criteria) | 8 | Frontend 2 |

**Sprint 3 Total:** 71 pts + supporting work ≈ 130 pts

**Sprint 3 Exit Criteria:**
- [ ] Full judging flow: create tracks → assign judges → submissions close → judges score from phones → leaderboard ranks update live
- [ ] Double-booking detection fires correctly for overlapping track assignments
- [ ] Scores CSV export is accurate and matches leaderboard ranking

---

### Sprint 4 — Sponsor Management & Finance (Weeks 9–10)
**Goal:** Organizers can manage sponsors, deliverables, and budget.
**Capacity:** 130 pts

| Story | Title | Points | Owner |
|---|---|---|---|
| US-060 | Sponsor Profile & Tier Management | 8 | Backend 1 + Frontend 1 |
| US-061 | Sponsor Portal (Read-Only) | 5 | Backend 2 + Frontend 2 |
| US-070 | Budget Planning & Tracking | 8 | Backend 2 + Frontend 1 |
| US-071 | Expense Submission & Reimbursement Workflow | 8 | Backend 1 + Frontend 2 |
| — | Sponsor logo S3 upload + CDN URL generation | 3 | DevOps |
| — | Sponsor deliverable overdue alert system (cron job, dashboard badge) | 5 | Backend 1 |
| — | Finance ↔ Sponsor payment sync (auto income entry on payment logged) | 5 | Backend 2 |
| — | Budget dashboard UI with variance visualization | 8 | Frontend 1 |
| — | Expense list + approval queue UI | 8 | Frontend 2 |
| — | One-click sponsor recap PDF (Puppeteer template) | 8 | Backend 1 |
| — | Finance CSV + PDF export (university accounting format) | 5 | Backend 2 |

**Sprint 4 Total:** 71 pts + supporting work ≈ 130 pts

**Sprint 4 Exit Criteria:**
- [ ] Create sponsor, log deliverables, mark one overdue — alert appears in dashboard within 1 minute
- [ ] Submit expense, approve, export CSV — all states correct; approver cannot approve own expense
- [ ] Sponsor recap PDF downloads with event metrics populated

---

### Sprint 5 — Marketing, Reporting & Integrations (Weeks 11–12)
**Goal:** Marketing campaigns send; post-event report generates; core integrations wired.
**Capacity:** 130 pts

| Story | Title | Points | Owner |
|---|---|---|---|
| US-080 | Email Campaign Builder | 13 | Backend 1 + Frontend 1 |
| US-081 | Referral Link Tracking & Hype Dashboard | 8 | Backend 2 + Frontend 2 |
| US-082 | Social Copy Generator (Claude API) | 5 | Backend 1 |
| US-090 | Auto-Assembled Event Report | 13 | Backend 2 + Frontend 1 |
| — | Puppeteer PDF pipeline for event report (async job + BullMQ) | 8 | Backend 1 |
| — | Report share link (org-scoped, no-login read access) | 5 | Backend 2 |
| — | Campaign metrics webhook handler (Resend events → DB) | 5 | Backend 1 |
| — | Report UI: summary editor, photo upload, export triggers | 8 | Frontend 2 |
| — | Campaign builder UI (block editor, recipient targeting, schedule send) | 13 | Frontend 1 |

**Sprint 5 Total:** 78 pts + supporting work ≈ 130 pts

**Sprint 5 Exit Criteria:**
- [ ] Send a campaign to 100 test participants — all delivered; open rate visible within 10 minutes
- [ ] Generate post-event report — all sections populated from live data; PDF downloads within 30 seconds
- [ ] Social copy generator produces 4 platform variants from a prompt in < 5 seconds

---

### Sprint 6 — Hardening, Performance & Beta Prep (Weeks 13–14)
**Goal:** Platform is production-ready, load-tested, and accessible for beta users.
**Capacity:** 130 pts

| Story | Title | Points | Owner |
|---|---|---|---|
| — | Load test: simulate 1,000 simultaneous QR scans — verify p99 < 300ms | 8 | DevOps + Backend |
| — | Load test: 500 concurrent WebSocket connections — verify no dropped events | 5 | Backend 1 |
| — | WCAG 2.1 AA audit on all participant-facing pages (axe-core automated + manual) | 8 | Frontend 1 + Frontend 2 |
| — | Security review: RLS policy audit, input validation sweep, file upload hardening | 13 | Tech Lead + Backend |
| — | Audit log implementation (status changes on participants, expenses, deliverables) | 5 | Backend 2 |
| — | Production Postgres RLS policy deployment + integration test suite | 8 | Backend 1 |
| — | Error monitoring setup (Sentry, source maps, alert routing) | 3 | DevOps |
| — | Database index audit + slow query log review | 5 | Backend 2 |
| — | E2E test suite for critical paths (Playwright): registration → check-in → submission → judging | 13 | Full-Stack |
| — | Mobile regression sweep: iOS Safari, Android Chrome, all major flows | 8 | Frontend 2 |
| — | Onboarding flow polish: empty states, tooltips, first-event checklist | 8 | Frontend 1 |
| — | Beta onboarding: invite 3 university hackathon teams; support doc draft | 5 | Tech Lead |

**Sprint 6 Total:** 89 pts
*(Lower intentionally — quality work is slower and less point-dense; budget buffer for discovered issues)*

**Sprint 6 Exit Criteria:**
- [ ] p99 QR scan latency < 300ms under 1,000 concurrent scans
- [ ] 0 WCAG AA violations on participant-facing pages (axe-core)
- [ ] All Playwright E2E tests passing on staging
- [ ] Security review sign-off from Tech Lead
- [ ] 3 beta teams onboarded and running a test event

---

### Sprint 7 — Beta Feedback & P2 Features (Weeks 15–16)
**Goal:** Address beta feedback; ship P2 integrations and polish.
**Capacity:** 130 pts

| Story | Title | Points | Owner |
|---|---|---|---|
| — | MLH API integration (affiliation validation, event data share) | 8 | Backend 1 |
| — | Google / Apple Wallet QR code pass generation | 8 | Backend 2 |
| — | Slack / Discord webhook integration (check-in alerts, overdue deliverables) | 5 | Backend 1 |
| — | Zapier trigger events (new registration, status change, score submitted) | 8 | Backend 2 |
| — | Devpost project import (CSV/JSON one-time migration tool) | 5 | Full-Stack |
| — | University SSO (SAML/OIDC) — first customer integration | 13 | Tech Lead + Backend |
| — | Beta feedback backlog (issues triaged from 3 beta teams) | 40 | Full team |
| — | Performance budget enforcement (Lighthouse CI in pipeline) | 5 | DevOps |
| — | Documentation: API reference (auto-generated from OpenAPI spec) | 8 | Backend 1 |

**Sprint 7 Total:** 100 pts

---

## Backlog Health Metrics

| Metric | Target |
|---|---|
| Stories estimated before sprint | 100% |
| Stories completed per sprint (no carry-over) | ≥ 85% |
| Bug ratio (bugs opened vs. stories completed) | < 0.2 bugs/story |
| P0 bugs open at sprint end | 0 |
| Test coverage (new code) | ≥ 80% |
| Accessibility violations in CI | 0 (axe-core, participant pages) |
| Mean time to review (PR open → approved) | < 4 hours |
